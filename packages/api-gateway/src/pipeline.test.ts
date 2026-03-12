import { beforeEach, describe, expect, it } from "bun:test";
import { PaymentPipeline, type PaymentPipelineServices, type PaymentRequest } from "./pipeline";

class InMemoryIdempotencyStore {
  private readonly records = new Map<
    string,
    { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" }
  >();

  public has(key: string): boolean {
    return this.records.has(key);
  }

  public get(key: string):
    | { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" }
    | undefined {
    return this.records.get(key);
  }

  public set(
    key: string,
    record: { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" },
  ): void {
    this.records.set(key, record);
  }
}

interface TestHarness {
  services: PaymentPipelineServices;
  calls: {
    kyaVerify: number;
    capabilityVerify: number;
    policyEvaluate: number;
    riskEvaluate: number;
    settlementSubmit: number;
    settlementConfirm: number;
    ledgerCreateEntry: number;
    decisionAppend: number;
  };
  decisionOutcomes: string[];
}

interface HarnessOptions {
  kyaAgentId?: string;
  policyAllowed?: boolean;
  policyReasons?: string[];
  riskDecision?: "ALLOW" | "HOLD" | "BLOCK";
  riskScore?: number;
  riskReasons?: string[];
  submitStatus?: "PENDING" | "FAILED";
  submitReason?: string;
  confirmStatus?: "SETTLED" | "FAILED";
  confirmReason?: string;
  ledgerFails?: boolean;
  complianceFails?: boolean;
}

function createHarness(options: HarnessOptions = {}): TestHarness {
  const calls = {
    kyaVerify: 0,
    capabilityVerify: 0,
    policyEvaluate: 0,
    riskEvaluate: 0,
    settlementSubmit: 0,
    settlementConfirm: 0,
    ledgerCreateEntry: 0,
    decisionAppend: 0,
  };
  const decisionOutcomes: string[] = [];
  const idempotencyStore = new InMemoryIdempotencyStore();

  const services: PaymentPipelineServices = {
    kya: {
      verify: () => {
        calls.kyaVerify += 1;
        return { sub: options.kyaAgentId ?? "agent-1" };
      },
    },
    capability: {
      verify: () => {
        calls.capabilityVerify += 1;
      },
    },
    policy: {
      evaluate: () => {
        calls.policyEvaluate += 1;
        return {
          allowed: options.policyAllowed ?? true,
          policy_version: "1.0.0",
          reason_codes: options.policyReasons ?? [],
        };
      },
    },
    risk: {
      evaluate: () => {
        calls.riskEvaluate += 1;
        return {
          risk_score: options.riskScore ?? 18,
          decision: options.riskDecision ?? "ALLOW",
          reason_codes: options.riskReasons ?? ["LOW_RISK"],
        };
      },
    },
    settlement: {
      stateMachine: {
        initiate: () => undefined,
        transition: () => undefined,
      },
      rail: {
        submit: async () => {
          calls.settlementSubmit += 1;
          return {
            reference_id: "ref-1",
            status: options.submitStatus ?? "PENDING",
            reason: options.submitReason,
          };
        },
        confirm: async () => {
          calls.settlementConfirm += 1;
          return {
            reference_id: "ref-1",
            status: options.confirmStatus ?? "SETTLED",
            reason: options.confirmReason,
          };
        },
      },
      idempotencyStore,
    },
    ledger: {
      createEntry: async () => {
        calls.ledgerCreateEntry += 1;
        if (options.ledgerFails) {
          throw new Error("LEDGER_WRITE_FAILED");
        }
        return { ok: true };
      },
    },
    compliance: {
      append: async (input) => {
        calls.decisionAppend += 1;
        if (options.complianceFails) {
          throw new Error("DECISION_STORE_DOWN");
        }
        decisionOutcomes.push(input.outcome);
        return { id: `decision-${calls.decisionAppend}` };
      },
    },
  };

  return { services, calls, decisionOutcomes };
}

function makeRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    payment_id: overrides.payment_id ?? "pay-1",
    agent_id: overrides.agent_id ?? "agent-1",
    capability_id: overrides.capability_id ?? "cap-1",
    amount_sgd_cents: overrides.amount_sgd_cents ?? 25_000,
    counterparty_id: overrides.counterparty_id ?? "merchant-1",
    action: overrides.action ?? "PAYMENT_TRANSFER",
    idempotency_key: overrides.idempotency_key ?? "idem-1",
  };
}

describe("PaymentPipeline integration", () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it("settles payment end-to-end with all stages done", async () => {
    const pipeline = new PaymentPipeline(harness.services);
    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("SETTLED");
    expect(result.decision_id).toBe("decision-1");
    expect(result.risk_score).toBe(18);
    expect(result.pipeline_stages.map((stage) => stage.name)).toEqual([
      "KYA Verify",
      "Capability Check",
      "Policy Eval",
      "Risk Score",
      "Settlement Execute",
      "Ledger Update",
      "Decision Record",
    ]);
    expect(result.pipeline_stages.every((stage) => stage.status === "DONE")).toBe(true);
    expect(harness.calls.settlementSubmit).toBe(1);
    expect(harness.calls.settlementConfirm).toBe(1);
    expect(harness.calls.ledgerCreateEntry).toBe(1);
    expect(harness.decisionOutcomes).toEqual(["APPROVED"]);
  });

  it("returns cached result for same idempotency key", async () => {
    const pipeline = new PaymentPipeline(harness.services);
    const request = makeRequest();

    const first = await pipeline.execute(request, { svid: "svid-1" });
    const second = await pipeline.execute(
      makeRequest({ payment_id: "pay-2", idempotency_key: request.idempotency_key }),
      { svid: "svid-1" },
    );

    expect(second).toEqual(first);
    expect(harness.calls.kyaVerify).toBe(1);
    expect(harness.calls.ledgerCreateEntry).toBe(1);
    expect(harness.calls.decisionAppend).toBe(1);
  });

  it("fails when policy denies and records rejected decision", async () => {
    harness = createHarness({ policyAllowed: false, policyReasons: ["NO_MATCHING_POLICY"] });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toEqual(["NO_MATCHING_POLICY"]);
    expect(harness.calls.riskEvaluate).toBe(0);
    expect(harness.calls.decisionAppend).toBe(1);
    expect(harness.decisionOutcomes).toEqual(["REJECTED"]);
  });

  it("returns HELD when risk decision is HOLD", async () => {
    harness = createHarness({ riskDecision: "HOLD", riskScore: 82, riskReasons: ["GEO_MISMATCH"] });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("HELD");
    expect(result.risk_score).toBe(82);
    expect(result.reason_codes).toEqual(["GEO_MISMATCH"]);
    expect(harness.calls.settlementSubmit).toBe(0);
    expect(harness.calls.ledgerCreateEntry).toBe(0);
    expect(harness.decisionOutcomes).toEqual(["HELD"]);
  });

  it("fails when risk decision is BLOCK", async () => {
    harness = createHarness({ riskDecision: "BLOCK", riskScore: 95, riskReasons: ["SANCTIONS_HIT"] });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toEqual(["SANCTIONS_HIT"]);
    expect(harness.calls.settlementSubmit).toBe(0);
    expect(harness.calls.ledgerCreateEntry).toBe(0);
    expect(harness.decisionOutcomes).toEqual(["REJECTED"]);
  });

  it("fails on rail submit failure and persists rejected decision", async () => {
    harness = createHarness({ submitStatus: "FAILED", submitReason: "SANDBOX_RANDOM_FAILURE" });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toContain("SANDBOX_RANDOM_FAILURE");
    expect(result.pipeline_stages.find((stage) => stage.name === "Settlement Execute")?.status).toBe("ERROR");
    expect(harness.calls.decisionAppend).toBe(1);
    expect(harness.decisionOutcomes).toEqual(["REJECTED"]);
  });

  it("fails on rail confirm failure and records decision", async () => {
    harness = createHarness({ confirmStatus: "FAILED", confirmReason: "SUBMISSION_NOT_FOUND" });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toContain("SUBMISSION_NOT_FOUND");
    expect(harness.calls.settlementSubmit).toBe(1);
    expect(harness.calls.settlementConfirm).toBe(1);
    expect(harness.calls.decisionAppend).toBe(1);
  });

  it("fails on ledger write error and still records decision", async () => {
    harness = createHarness({ ledgerFails: true });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toContain("LEDGER_WRITE_FAILED");
    expect(result.pipeline_stages.find((stage) => stage.name === "Ledger Update")?.status).toBe("ERROR");
    expect(harness.calls.decisionAppend).toBe(1);
  });

  it("fails on KYA mismatch and writes failure decision", async () => {
    harness = createHarness({ kyaAgentId: "agent-2" });
    const pipeline = new PaymentPipeline(harness.services);

    const result = await pipeline.execute(makeRequest(), { svid: "svid-1" });

    expect(result.status).toBe("FAILED");
    expect(result.reason_codes).toContain("KYA_AGENT_MISMATCH");
    expect(result.pipeline_stages[0]).toEqual({
      name: "KYA Verify",
      status: "ERROR",
      elapsed_ms: result.pipeline_stages[0]?.elapsed_ms,
    });
    expect(harness.calls.decisionAppend).toBe(1);
  });

  it("keeps p95 latency below 500ms for in-memory flow", async () => {
    const pipeline = new PaymentPipeline(harness.services);
    const elapsed: number[] = [];

    for (let i = 0; i < 40; i += 1) {
      const result = await pipeline.execute(
        makeRequest({ payment_id: `pay-${i}`, idempotency_key: `idem-${i}` }),
        { svid: "svid-1" },
      );
      elapsed.push(result.elapsed_ms);
    }

    const sorted = [...elapsed].sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[p95Index] ?? 0;

    expect(p95).toBeLessThan(500);
  });
});
