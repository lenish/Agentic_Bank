import { beforeEach, describe, expect, it } from "bun:test";
import { PolicyEngine, ShadowEvaluator, createPolicyStore } from "./index";
import type { PolicyEvalInput, PolicyRule, PolicyVersion } from "./index";

const POLICY_ID = "policy-payment";

function createInput(overrides: Partial<PolicyEvalInput> = {}): PolicyEvalInput {
  return {
    agent_id: "agent-1",
    action_type: "PAYMENT_INITIATE",
    amount_sgd_cents: 30_000,
    counterparty_id: "counterparty-a",
    occurred_at: new Date("2026-03-12T10:00:00.000Z"),
    ...overrides,
  };
}

function createVersion(version: string, rules: PolicyRule[]): Omit<PolicyVersion, "created_at"> {
  return {
    policy_id: POLICY_ID,
    version,
    rules,
    effective_from: new Date("2026-03-12T00:00:00.000Z"),
  };
}

describe("PolicyEngine", () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine(createPolicyStore());
  });

  it("denies by default when no policy exists", () => {
    const result = engine.evaluate(POLICY_ID, createInput());

    expect(result.allowed).toBeFalse();
    expect(result.policy_version).toBeNull();
    expect(result.reason_codes).toEqual(["NO_MATCHING_POLICY"]);
    expect(result.matched_rule_id).toBeNull();
    expect(result.evaluated_at).toBeInstanceOf(Date);
  });

  it("allows request when amount is within limit", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "allow-500-sgd",
          name: "allow up to 500 SGD",
          priority: 100,
          effect: "ALLOW",
          amount_limit: { max_amount_sgd_cents: 50_000 },
          action_types: ["PAYMENT_INITIATE"],
        },
      ])
    );

    const result = engine.evaluate(POLICY_ID, createInput({ amount_sgd_cents: 30_000 }));

    expect(result.allowed).toBeTrue();
    expect(result.policy_version).toBe("1.0.0");
    expect(result.reason_codes).toEqual(["POLICY_ALLOWED"]);
    expect(result.matched_rule_id).toBe("allow-500-sgd");
  });

  it("denies request when amount exceeds configured limit", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "allow-500-sgd",
          name: "allow up to 500 SGD",
          priority: 100,
          effect: "ALLOW",
          amount_limit: { max_amount_sgd_cents: 50_000 },
          action_types: ["PAYMENT_INITIATE"],
        },
      ])
    );

    const result = engine.evaluate(POLICY_ID, createInput({ amount_sgd_cents: 70_000 }));

    expect(result.allowed).toBeFalse();
    expect(result.policy_version).toBe("1.0.0");
    expect(result.reason_codes).toContain("AMOUNT_LIMIT_EXCEEDED");
    expect(result.matched_rule_id).toBeNull();
  });

  it("enforces counterparty whitelist", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "whitelist-counterparties",
          name: "allow approved counterparties",
          priority: 100,
          effect: "ALLOW",
          counterparty_whitelist: ["counterparty-a", "counterparty-b"],
          action_types: ["PAYMENT_INITIATE"],
        },
      ])
    );

    const result = engine.evaluate(POLICY_ID, createInput({ counterparty_id: "counterparty-z" }));

    expect(result.allowed).toBeFalse();
    expect(result.reason_codes).toContain("COUNTERPARTY_NOT_ALLOWED");
  });

  it("enforces time-of-day constraints including overnight range", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "night-window",
          name: "allow only 22:00-02:00 UTC",
          priority: 100,
          effect: "ALLOW",
          action_types: ["PAYMENT_INITIATE"],
          time_of_day: { start_hour: 22, end_hour: 2 },
        },
      ])
    );

    const allowed = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T23:10:00.000Z") })
    );
    const denied = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T03:10:00.000Z") })
    );

    expect(allowed.allowed).toBeTrue();
    expect(denied.allowed).toBeFalse();
    expect(denied.reason_codes).toContain("OUTSIDE_ALLOWED_TIME_WINDOW");
  });

  it("enforces frequency limits", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "frequency-1-per-hour",
          name: "allow one transaction per hour",
          priority: 100,
          effect: "ALLOW",
          action_types: ["PAYMENT_INITIATE"],
          frequency_limit: { max_count: 1, window_minutes: 60 },
        },
      ])
    );

    const first = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T10:00:00.000Z") })
    );
    const second = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T10:30:00.000Z") })
    );

    expect(first.allowed).toBeTrue();
    expect(second.allowed).toBeFalse();
    expect(second.reason_codes).toContain("FREQUENCY_LIMIT_EXCEEDED");
  });

  it("preserves old versions and can evaluate specific version in simulation", () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "allow-500-sgd",
          name: "allow up to 500 SGD",
          priority: 100,
          effect: "ALLOW",
          amount_limit: { max_amount_sgd_cents: 50_000 },
          action_types: ["PAYMENT_INITIATE"],
        },
      ])
    );
    engine.registerPolicyVersion(
      createVersion("1.1.0", [
        {
          id: "allow-200-sgd",
          name: "allow up to 200 SGD",
          priority: 100,
          effect: "ALLOW",
          amount_limit: { max_amount_sgd_cents: 20_000 },
          action_types: ["PAYMENT_INITIATE"],
        },
      ])
    );

    const versions = engine.listPolicyVersions(POLICY_ID);
    const currentEval = engine.evaluate(POLICY_ID, createInput({ amount_sgd_cents: 30_000 }));
    const simulatedOldEval = engine.simulate(POLICY_ID, createInput({ amount_sgd_cents: 30_000 }), "1.0.0");

    expect(versions.map((version) => version.version)).toEqual(["1.0.0", "1.1.0"]);
    expect(currentEval.allowed).toBeFalse();
    expect(simulatedOldEval.allowed).toBeTrue();
    expect(simulatedOldEval.policy_version).toBe("1.0.0");
  });

  it("supports shadow evaluation without mutating real decision side effects", async () => {
    engine.registerPolicyVersion(
      createVersion("1.0.0", [
        {
          id: "current-frequency",
          name: "current one-per-hour",
          priority: 100,
          effect: "ALLOW",
          action_types: ["PAYMENT_INITIATE"],
          frequency_limit: { max_count: 1, window_minutes: 60 },
        },
      ])
    );

    const shadow = new ShadowEvaluator(engine);
    const candidate: PolicyVersion = {
      ...createVersion("2.0.0", [
        {
          id: "candidate-frequency",
          name: "candidate allows two-per-hour",
          priority: 100,
          effect: "ALLOW",
          action_types: ["PAYMENT_INITIATE"],
          frequency_limit: { max_count: 2, window_minutes: 60 },
        },
      ]),
      created_at: new Date("2026-03-12T00:00:00.000Z"),
    };

    const firstActual = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T10:00:00.000Z") })
    );
    expect(firstActual.allowed).toBeTrue();

    const comparison = await shadow.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T10:30:00.000Z") }),
      candidate
    );

    const secondActual = engine.evaluate(
      POLICY_ID,
      createInput({ occurred_at: new Date("2026-03-12T10:30:00.000Z") })
    );

    expect(comparison.actual.allowed).toBeFalse();
    expect(comparison.shadow.allowed).toBeTrue();
    expect(comparison.diverged).toBeTrue();
    expect(secondActual.allowed).toBeFalse();
    expect(secondActual.reason_codes).toContain("FREQUENCY_LIMIT_EXCEEDED");
  });
});
