import { describe, test, expect, beforeEach } from "bun:test";
import { DisputeService } from "./dispute";
import type { CreateDisputeInput } from "./dispute";

function makeInput(overrides?: Partial<CreateDisputeInput>): CreateDisputeInput {
  return {
    payment_id: "pay-001",
    agent_id: "agent-payment-001",
    amount_sgd_cents: 100_000, // 1,000 SGD — above auto-accept
    reason_code: "UNAUTHORIZED_CHARGE",
    ...overrides,
  };
}

describe("DisputeService", () => {
  let service: DisputeService;

  beforeEach(() => {
    service = new DisputeService();
  });

  // =========================================================================
  // QA scenario 1: auto-accept below 50 SGD
  // =========================================================================

  test("auto-accept: 30 SGD dispute → RESOLVED with AUTO_REFUND", () => {
    const result = service.createDispute(
      makeInput({ amount_sgd_cents: 3_000 }) // 30 SGD
    );

    expect(result.status).toBe("RESOLVED");
    expect(result.resolution).toBe("AUTO_REFUND");
    expect(result.resolved_at).toBeInstanceOf(Date);
    expect(result.case_id.startsWith("DSP-")).toBe(true);
  });

  // =========================================================================
  // QA scenario 2: 1,000 SGD dispute → evidence gathering with SLA
  // =========================================================================

  test("1,000 SGD dispute → EVIDENCE_GATHERING with respond_by_at", () => {
    const result = service.createDispute(
      makeInput({ amount_sgd_cents: 100_000 }) // 1,000 SGD
    );

    expect(result.status).toBe("EVIDENCE_GATHERING");
    expect(result.resolution).toBeUndefined();
    expect(result.resolved_at).toBeUndefined();
    expect(result.respond_by_at).toBeInstanceOf(Date);
    expect(result.respond_by_at.getTime()).toBeGreaterThan(
      result.created_at.getTime()
    );
  });

  // =========================================================================
  // Boundary: exactly at threshold (5,000 cents = 50 SGD)
  // =========================================================================

  test("exactly 50 SGD (5,000 cents) → NOT auto-accepted (threshold is strictly less than)", () => {
    const result = service.createDispute(
      makeInput({ amount_sgd_cents: 5_000 })
    );

    expect(result.status).toBe("EVIDENCE_GATHERING");
    expect(result.resolution).toBeUndefined();
  });

  // =========================================================================
  // Full lifecycle: create → add evidence → submit → resolve
  // =========================================================================

  test("full lifecycle: EVIDENCE_GATHERING → addEvidence → SUBMITTED → RESOLVED", () => {
    const dispute = service.createDispute(makeInput());
    expect(dispute.status).toBe("EVIDENCE_GATHERING");

    // Add evidence
    const withEvidence = service.addEvidence(dispute.case_id, "txn-rec-001");
    expect(withEvidence.evidence).toContain("txn-rec-001");

    service.addEvidence(dispute.case_id, "dec-rec-002");
    expect(withEvidence.evidence).toHaveLength(2);

    // Submit
    const submitted = service.submitDispute(dispute.case_id);
    expect(submitted.status).toBe("SUBMITTED");

    // Resolve
    const resolved = service.resolveDispute(dispute.case_id, "MANUAL_REFUND");
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolution).toBe("MANUAL_REFUND");
    expect(resolved.resolved_at).toBeInstanceOf(Date);
  });

  // =========================================================================
  // getDisputesByAgent
  // =========================================================================

  test("getDisputesByAgent returns only that agent's cases", () => {
    service.createDispute(makeInput({ agent_id: "agent-A" }));
    service.createDispute(makeInput({ agent_id: "agent-A" }));
    service.createDispute(makeInput({ agent_id: "agent-B" }));

    const agentACases = service.getDisputesByAgent("agent-A");
    expect(agentACases).toHaveLength(2);
    expect(agentACases.every((c) => c.agent_id === "agent-A")).toBe(true);

    const agentBCases = service.getDisputesByAgent("agent-B");
    expect(agentBCases).toHaveLength(1);
  });

  // =========================================================================
  // State transition errors
  // =========================================================================

  test("submitDispute throws on non-EVIDENCE_GATHERING status", () => {
    // Create auto-accepted dispute (RESOLVED)
    const dispute = service.createDispute(
      makeInput({ amount_sgd_cents: 1_000 }) // 10 SGD → auto-accept
    );

    expect(() => service.submitDispute(dispute.case_id)).toThrow(
      "DISPUTE_INVALID_STATE"
    );
  });

  test("resolveDispute throws on non-SUBMITTED status", () => {
    const dispute = service.createDispute(makeInput());
    // Status is EVIDENCE_GATHERING, not SUBMITTED
    expect(() =>
      service.resolveDispute(dispute.case_id, "REJECTED")
    ).toThrow("DISPUTE_INVALID_STATE");
  });

  // =========================================================================
  // SLA breach detection
  // =========================================================================

  test("checkSlaBreaches returns cases past deadline that are not resolved", () => {
    const dispute = service.createDispute(makeInput());

    // Manually set respond_by_at to the past to simulate SLA breach
    dispute.respond_by_at = new Date(Date.now() - 86_400_000); // 1 day ago

    const breaches = service.checkSlaBreaches();
    expect(breaches).toHaveLength(1);
    expect(breaches[0].case_id).toBe(dispute.case_id);
  });

  test("checkSlaBreaches excludes resolved cases", () => {
    const dispute = service.createDispute(makeInput());
    dispute.respond_by_at = new Date(Date.now() - 86_400_000); // past deadline

    // Move through lifecycle to RESOLVED
    service.submitDispute(dispute.case_id);
    service.resolveDispute(dispute.case_id, "SETTLED");

    const breaches = service.checkSlaBreaches();
    expect(breaches).toHaveLength(0);
  });

  // =========================================================================
  // Validation
  // =========================================================================

  test("throws on invalid input: empty payment_id", () => {
    expect(() =>
      service.createDispute(makeInput({ payment_id: "" }))
    ).toThrow("DISPUTE_PAYMENT_ID_REQUIRED");
  });

  test("throws on invalid amount (negative)", () => {
    expect(() =>
      service.createDispute(makeInput({ amount_sgd_cents: -100 }))
    ).toThrow("DISPUTE_AMOUNT_INVALID");
  });

  // =========================================================================
  // getDispute
  // =========================================================================

  test("getDispute returns undefined for unknown case_id", () => {
    expect(service.getDispute("DSP-NONEXIST")).toBeUndefined();
  });

  // =========================================================================
  // addEvidence error
  // =========================================================================

  test("addEvidence throws for non-existent case", () => {
    expect(() => service.addEvidence("DSP-NOPE", "ev-001")).toThrow(
      "DISPUTE_CASE_NOT_FOUND"
    );
  });

  test("addEvidence throws for RESOLVED case", () => {
    const dispute = service.createDispute(
      makeInput({ amount_sgd_cents: 1_000 }) // auto-accept → RESOLVED
    );

    expect(() => service.addEvidence(dispute.case_id, "ev-001")).toThrow(
      "DISPUTE_INVALID_STATE"
    );
  });
});
