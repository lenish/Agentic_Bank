import { describe, test, expect, beforeEach } from "bun:test";
import { DecisionRecordService } from "./decision-record";
import type { DecisionRecord, DecisionRecordInput } from "./schema";

function makeInput(overrides?: Partial<DecisionRecordInput>): DecisionRecordInput {
  return {
    trace_id: "trace-001",
    agent_id: "agent-policy-001",
    input_snapshot: { amount_cents: 50000, currency: "SGD", merchant: "grab" },
    policy_version: "1.2.0",
    model_version: null,
    reason_codes: ["WITHIN_LIMIT", "KYA_VERIFIED"],
    outcome: "APPROVED",
    override_actor: null,
    metadata: { layer: "policy" },
    ...overrides,
  };
}

describe("DecisionRecordService", () => {
  let service: DecisionRecordService;

  beforeEach(() => {
    service = new DecisionRecordService();
  });

  // --- append() ---

  test("append() stores record and returns it with generated id + created_at", async () => {
    const input = makeInput();
    const record = await service.append(input);

    // Auto-generated fields
    expect(record.id).toBeDefined();
    expect(record.id.length).toBeGreaterThan(0);
    expect(record.created_at).toBeDefined();
    // Validate ISO 8601
    expect(new Date(record.created_at).toISOString()).toBe(record.created_at);

    // Input fields preserved
    expect(record.trace_id).toBe("trace-001");
    expect(record.agent_id).toBe("agent-policy-001");
    expect(record.input_snapshot).toEqual({
      amount_cents: 50000,
      currency: "SGD",
      merchant: "grab",
    });
    expect(record.policy_version).toBe("1.2.0");
    expect(record.model_version).toBeNull();
    expect(record.reason_codes).toEqual(["WITHIN_LIMIT", "KYA_VERIFIED"]);
    expect(record.outcome).toBe("APPROVED");
    expect(record.override_actor).toBeNull();
    expect(record.metadata).toEqual({ layer: "policy" });
  });

  test("second append with same trace_id is allowed (policy + risk both record)", async () => {
    const policyRecord = await service.append(
      makeInput({ trace_id: "trace-shared", agent_id: "agent-policy" })
    );
    const riskRecord = await service.append(
      makeInput({
        trace_id: "trace-shared",
        agent_id: "agent-risk",
        outcome: "HELD",
        reason_codes: ["HIGH_RISK_MERCHANT"],
        metadata: { layer: "risk" },
      })
    );

    // Both stored with distinct IDs
    expect(policyRecord.id).not.toBe(riskRecord.id);
    expect(policyRecord.trace_id).toBe("trace-shared");
    expect(riskRecord.trace_id).toBe("trace-shared");

    // Both retrievable
    const records = await service.getByTraceId("trace-shared");
    expect(records).toHaveLength(2);
  });

  // --- Immutability enforcement ---

  test("no update/delete methods exist on service (TypeScript compile check)", () => {
    // Runtime check that update/delete are NOT present on the service instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceAsAny = service as unknown as Record<string, unknown>;
    expect(serviceAsAny["update"]).toBeUndefined();
    expect(serviceAsAny["delete"]).toBeUndefined();
    expect(serviceAsAny["remove"]).toBeUndefined();
    expect(serviceAsAny["modify"]).toBeUndefined();
    expect(serviceAsAny["patch"]).toBeUndefined();

    // Only expected methods exist
    expect(typeof serviceAsAny["append"]).toBe("function");
    expect(typeof serviceAsAny["getByTraceId"]).toBe("function");
    expect(typeof serviceAsAny["getByAgentId"]).toBe("function");
    expect(typeof serviceAsAny["getByOutcome"]).toBe("function");
  });

  test("stored records are frozen (cannot be mutated in memory)", async () => {
    const record = await service.append(makeInput());
    const retrieved = (await service.getByTraceId(record.trace_id))[0];

    // Object.freeze prevents property assignment
    expect(() => {
      (retrieved as any).outcome = "REJECTED";
    }).toThrow();
  });

  // --- getByTraceId ---

  test("getByTraceId returns correct record", async () => {
    await service.append(makeInput({ trace_id: "trace-A" }));
    await service.append(makeInput({ trace_id: "trace-B" }));
    await service.append(makeInput({ trace_id: "trace-A", agent_id: "agent-risk" }));

    const results = await service.getByTraceId("trace-A");
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.trace_id).toBe("trace-A"));

    const resultsB = await service.getByTraceId("trace-B");
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].trace_id).toBe("trace-B");
  });

  test("getByTraceId returns empty array for unknown trace", async () => {
    const results = await service.getByTraceId("nonexistent");
    expect(results).toEqual([]);
  });

  // --- getByAgentId with time range ---

  test("getByAgentId with time range filter works", async () => {
    // Insert records with known ordering
    const r1 = await service.append(
      makeInput({ agent_id: "agent-X", trace_id: "t1" })
    );
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    const midpoint = new Date();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const r2 = await service.append(
      makeInput({ agent_id: "agent-X", trace_id: "t2" })
    );
    await service.append(makeInput({ agent_id: "agent-Y", trace_id: "t3" }));

    // All records for agent-X
    const all = await service.getByAgentId("agent-X");
    expect(all).toHaveLength(2);

    // Only records after midpoint
    const afterMid = await service.getByAgentId("agent-X", { from: midpoint });
    expect(afterMid).toHaveLength(1);
    expect(afterMid[0].trace_id).toBe("t2");

    // Only records before midpoint
    const beforeMid = await service.getByAgentId("agent-X", { to: midpoint });
    expect(beforeMid).toHaveLength(1);
    expect(beforeMid[0].trace_id).toBe("t1");
  });

  // --- getByOutcome ---

  test("getByOutcome('REJECTED') returns only REJECTED records", async () => {
    await service.append(makeInput({ outcome: "APPROVED", trace_id: "t1" }));
    await service.append(
      makeInput({
        outcome: "REJECTED",
        trace_id: "t2",
        reason_codes: ["OVER_LIMIT"],
      })
    );
    await service.append(makeInput({ outcome: "HELD", trace_id: "t3" }));
    await service.append(
      makeInput({
        outcome: "REJECTED",
        trace_id: "t4",
        reason_codes: ["BLOCKED_COUNTRY"],
      })
    );

    const rejected = await service.getByOutcome("REJECTED");
    expect(rejected).toHaveLength(2);
    rejected.forEach((r) => expect(r.outcome).toBe("REJECTED"));

    const held = await service.getByOutcome("HELD");
    expect(held).toHaveLength(1);
    expect(held[0].trace_id).toBe("t3");

    const approved = await service.getByOutcome("APPROVED");
    expect(approved).toHaveLength(1);
  });

  // --- Record field verification ---

  test("verify record fields: policy_version, reason_codes, trace_id all present", async () => {
    const record = await service.append(
      makeInput({
        policy_version: "2.5.1",
        reason_codes: ["AML_CHECK_PASS", "TRAVEL_RULE_OK"],
        trace_id: "trace-verify-fields",
        model_version: "gpt-4o-2025-03",
        override_actor: "ops-admin-001",
        metadata: { source: "dispute-engine", dispute_id: "disp-123" },
      })
    );

    expect(record.policy_version).toBe("2.5.1");
    expect(record.reason_codes).toEqual(["AML_CHECK_PASS", "TRAVEL_RULE_OK"]);
    expect(record.trace_id).toBe("trace-verify-fields");
    expect(record.model_version).toBe("gpt-4o-2025-03");
    expect(record.override_actor).toBe("ops-admin-001");
    expect(record.metadata).toEqual({
      source: "dispute-engine",
      dispute_id: "disp-123",
    });
    expect(record.id).toBeDefined();
    expect(record.created_at).toBeDefined();
  });

  test("reason_codes array is defensively copied (no shared reference)", async () => {
    const codes = ["CODE_A"];
    const record = await service.append(makeInput({ reason_codes: codes }));

    // Mutating the original array should NOT affect the stored record
    codes.push("CODE_B");
    expect(record.reason_codes).toEqual(["CODE_A"]);
  });

  test("metadata defaults to empty object when not provided", async () => {
    const record = await service.append(
      makeInput({ metadata: undefined })
    );
    expect(record.metadata).toEqual({});
  });
});
