import { describe, expect, it } from "bun:test";
import {
  AMOUNT_THRESHOLD_RULE,
  BALANCE_ANOMALY_RULE,
  COUNTERPARTY_NOVELTY_RULE,
  CROSS_AGENT_COORDINATION_RULE,
  DUPLICATE_REQUEST_RULE,
  HIGH_RISK_COUNTRY_RULE,
  RAPID_SUCCESSION_RULE,
  RiskEngine,
  ROUND_AMOUNT_RULE,
  SANCTIONED_ENTITY_RULE,
  SCOPE_DEVIATION_RULE,
  TIME_OF_DAY_RULE,
  VELOCITY_CHECK_RULE,
  type RiskEvalInput,
} from "./index";

function createInput(overrides: Partial<RiskEvalInput> = {}): RiskEvalInput {
  return {
    agent_id: "agent-1",
    amount_sgd_cents: 50_000,
    counterparty_id: "merchant-1",
    action: "TRANSFER",
    timestamp: new Date("2026-03-12T02:00:00.000Z"),
    agent_history: {
      transaction_count_last_hour: 1,
      transaction_count_last_day: 4,
      last_seen_counterparty_ids: ["merchant-1", "merchant-2"],
      is_dormant: false,
      transaction_count_last_5_minutes: 1,
    },
    geo_country: "SG",
    is_round_amount: false,
    request_id: "req-1",
    recent_request_ids: ["req-0"],
    ...overrides,
  };
}

describe("Risk rules", () => {
  it("triggers VELOCITY_CHECK when last-hour count exceeds 5", () => {
    const result = VELOCITY_CHECK_RULE.evaluate(
      createInput({
        agent_history: {
          transaction_count_last_hour: 6,
          transaction_count_last_day: 10,
          transaction_count_last_5_minutes: 2,
          last_seen_counterparty_ids: ["merchant-1"],
          is_dormant: false,
        },
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("HOLD");
  });

  it("triggers AMOUNT_THRESHOLD for amount above 50,000 SGD", () => {
    const result = AMOUNT_THRESHOLD_RULE.evaluate(createInput({ amount_sgd_cents: 5_000_001 }));

    expect(result.triggered).toBeTrue();
    expect(result.reason_code).toBe("AMOUNT_THRESHOLD");
  });

  it("triggers COUNTERPARTY_NOVELTY for first-time counterparty over 1,000 SGD", () => {
    const result = COUNTERPARTY_NOVELTY_RULE.evaluate(
      createInput({
        amount_sgd_cents: 100_001,
        counterparty_id: "merchant-new",
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("HOLD");
  });

  it("adds TIME_OF_DAY risk for outside 06:00-22:00 SGT", () => {
    const result = TIME_OF_DAY_RULE.evaluate(createInput({ timestamp: new Date("2026-03-12T15:00:00.000Z") }));

    expect(result.triggered).toBeTrue();
    expect(result.score).toBe(20);
    expect(result.decision).toBe("NONE");
  });

  it("blocks high-risk country", () => {
    const result = HIGH_RISK_COUNTRY_RULE.evaluate(createInput({ geo_country: "IR" }));

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("BLOCK");
  });

  it("blocks sanctioned entity counterparties", () => {
    const result = SANCTIONED_ENTITY_RULE.evaluate(createInput({ counterparty_id: "SANCTIONED_abc" }));

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("BLOCK");
  });

  it("blocks duplicate request IDs", () => {
    const result = DUPLICATE_REQUEST_RULE.evaluate(
      createInput({
        request_id: "req-123",
        recent_request_ids: ["req-001", "req-123"],
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("BLOCK");
  });

  it("triggers RAPID_SUCCESSION when last-5-minute count exceeds 3", () => {
    const result = RAPID_SUCCESSION_RULE.evaluate(
      createInput({
        agent_history: {
          transaction_count_last_hour: 7,
          transaction_count_last_day: 25,
          transaction_count_last_5_minutes: 4,
          last_seen_counterparty_ids: ["merchant-1"],
          is_dormant: false,
        },
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("HOLD");
  });

  it("adds ROUND_AMOUNT risk for >10,000 SGD", () => {
    const result = ROUND_AMOUNT_RULE.evaluate(
      createInput({
        is_round_amount: true,
        amount_sgd_cents: 1_100_000,
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.score).toBe(15);
  });

  it("triggers BALANCE_ANOMALY proxy for very large amount", () => {
    const result = BALANCE_ANOMALY_RULE.evaluate(createInput({ amount_sgd_cents: 1_000_000_01 }));

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("HOLD");
  });

  it("triggers CROSS_AGENT_COORDINATION for large agent-to-agent transfer", () => {
    const result = CROSS_AGENT_COORDINATION_RULE.evaluate(
      createInput({
        counterparty_id: "agent-peer-1",
        amount_sgd_cents: 500_001,
      })
    );

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("HOLD");
  });

  it("blocks action outside allowed scope", () => {
    const result = SCOPE_DEVIATION_RULE.evaluate(createInput({ action: "WITHDRAW_CASH" }));

    expect(result.triggered).toBeTrue();
    expect(result.decision).toBe("BLOCK");
  });
});

describe("RiskEngine", () => {
  it("returns BLOCK when any blocking rule triggers", () => {
    const engine = new RiskEngine();
    const result = engine.evaluate(createInput({ counterparty_id: "SANCTIONED_XYZ" }));

    expect(result.decision).toBe("BLOCK");
    expect(result.triggered_rules).toContain("SANCTIONED_ENTITY");
  });

  it("returns HOLD when hold rule triggers and no block rules trigger", () => {
    const engine = new RiskEngine();
    const result = engine.evaluate(
      createInput({
        agent_history: {
          transaction_count_last_hour: 6,
          transaction_count_last_day: 10,
          transaction_count_last_5_minutes: 2,
          last_seen_counterparty_ids: ["merchant-1"],
          is_dormant: false,
        },
      })
    );

    expect(result.decision).toBe("HOLD");
    expect(result.reason_codes).toContain("VELOCITY_CHECK");
  });

  it("caps risk_score at 100", () => {
    const engine = new RiskEngine();
    const result = engine.evaluate(
      createInput({
        amount_sgd_cents: 1_000_000_01,
        counterparty_id: "SANCTIONED_XYZ",
        action: "WITHDRAW_CASH",
        geo_country: "IR",
        is_round_amount: true,
        request_id: "dup-1",
        recent_request_ids: ["dup-1"],
        agent_history: {
          transaction_count_last_hour: 10,
          transaction_count_last_day: 200,
          transaction_count_last_5_minutes: 9,
          last_seen_counterparty_ids: [],
          is_dormant: true,
        },
        timestamp: new Date("2026-03-12T18:00:00.000Z"),
      })
    );

    expect(result.risk_score).toBe(100);
    expect(result.decision).toBe("BLOCK");
  });

  it("supports per-rule kill-switch activation/deactivation", () => {
    const engine = new RiskEngine();
    const input = createInput({ action: "WITHDRAW_CASH" });

    const blocked = engine.evaluate(input);
    expect(blocked.decision).toBe("BLOCK");

    engine.deactivateRule("SCOPE_DEVIATION");
    const allowedAfterDeactivate = engine.evaluate(input);
    expect(allowedAfterDeactivate.decision).toBe("ALLOW");
    expect(allowedAfterDeactivate.triggered_rules).not.toContain("SCOPE_DEVIATION");

    engine.activateRule("SCOPE_DEVIATION");
    const blockedAgain = engine.evaluate(input);
    expect(blockedAgain.decision).toBe("BLOCK");
  });

  it("holds when score exceeds 70 from additive non-blocking rules", () => {
    const highScoringEngine = new RiskEngine([
      {
        id: "SCORE_A",
        evaluate: () => ({ triggered: true, score: 40, decision: "NONE", reason_code: "SCORE_A" }),
      },
      {
        id: "SCORE_B",
        evaluate: () => ({ triggered: true, score: 35, decision: "NONE", reason_code: "SCORE_B" }),
      },
    ]);

    const result = highScoringEngine.evaluate(createInput());

    expect(result.decision).toBe("HOLD");
    expect(result.risk_score).toBe(75);
  });

  it("returns evaluation metadata including timing and timestamp", () => {
    const engine = new RiskEngine();
    const result = engine.evaluate(createInput());

    expect(result.evaluated_at).toBeInstanceOf(Date);
    expect(result.evaluation_ms).toBeGreaterThanOrEqual(0);
    expect(result.evaluation_ms).toBeLessThan(100);
  });
});
