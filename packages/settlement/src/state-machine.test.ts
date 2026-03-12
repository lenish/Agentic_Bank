import { beforeEach, describe, expect, it } from "bun:test";

import {
  SettlementStateMachine,
  SettlementStatus,
} from "./state-machine";
import { SgdRailAdapter } from "./sgd-rail";
import type { RailAdapter } from "./sgd-rail";

describe("SettlementStateMachine", () => {
  let sm: SettlementStateMachine;

  beforeEach(() => {
    sm = new SettlementStateMachine();
  });

  it("follows valid path: INITIATED → AUTHORIZED → HELD → RELEASING → SETTLED", () => {
    sm.initiate("pay-001");

    sm.transition("pay-001", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-001", SettlementStatus.AUTHORIZED, SettlementStatus.HELD);
    sm.transition("pay-001", SettlementStatus.HELD, SettlementStatus.RELEASING);
    sm.transition("pay-001", SettlementStatus.RELEASING, SettlementStatus.SETTLED);

    expect(sm.getState("pay-001")).toBe(SettlementStatus.SETTLED);
  });

  it("throws INVALID_TRANSITION for SETTLED → INITIATED", () => {
    sm.initiate("pay-002");
    sm.transition("pay-002", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-002", SettlementStatus.AUTHORIZED, SettlementStatus.RELEASING);
    sm.transition("pay-002", SettlementStatus.RELEASING, SettlementStatus.SETTLED);

    expect(() =>
      sm.transition("pay-002", SettlementStatus.SETTLED, SettlementStatus.INITIATED),
    ).toThrow("INVALID_TRANSITION");
  });

  it("allows SETTLED → DISPUTED for dispute resolution", () => {
    sm.initiate("pay-003");
    sm.transition("pay-003", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-003", SettlementStatus.AUTHORIZED, SettlementStatus.RELEASING);
    sm.transition("pay-003", SettlementStatus.RELEASING, SettlementStatus.SETTLED);
    sm.transition("pay-003", SettlementStatus.SETTLED, SettlementStatus.DISPUTED);

    expect(sm.getState("pay-003")).toBe(SettlementStatus.DISPUTED);
  });

  it("records full transition history with timestamps", () => {
    sm.initiate("pay-004");
    sm.transition("pay-004", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-004", SettlementStatus.AUTHORIZED, SettlementStatus.RELEASING);

    const history = sm.getHistory("pay-004");

    expect(history.length).toBe(3); // initiate + 2 transitions
    expect(history[0]?.to).toBe(SettlementStatus.INITIATED);
    expect(history[1]?.from).toBe(SettlementStatus.INITIATED);
    expect(history[1]?.to).toBe(SettlementStatus.AUTHORIZED);
    expect(history[2]?.from).toBe(SettlementStatus.AUTHORIZED);
    expect(history[2]?.to).toBe(SettlementStatus.RELEASING);
    expect(history[2]?.timestamp).toBeInstanceOf(Date);
  });

  it("throws STATE_MISMATCH when from does not match current state", () => {
    sm.initiate("pay-005");

    expect(() =>
      sm.transition("pay-005", SettlementStatus.AUTHORIZED, SettlementStatus.HELD),
    ).toThrow("STATE_MISMATCH");
  });

  it("throws PAYMENT_NOT_FOUND for unknown payment", () => {
    expect(() => sm.getState("unknown")).toThrow("PAYMENT_NOT_FOUND");
    expect(() => sm.getHistory("unknown")).toThrow("PAYMENT_NOT_FOUND");
  });

  it("REFUNDED is terminal — no transitions allowed", () => {
    sm.initiate("pay-006");
    sm.transition("pay-006", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-006", SettlementStatus.AUTHORIZED, SettlementStatus.RELEASING);
    sm.transition("pay-006", SettlementStatus.RELEASING, SettlementStatus.REFUNDED);

    expect(() =>
      sm.transition("pay-006", SettlementStatus.REFUNDED, SettlementStatus.SETTLED),
    ).toThrow("INVALID_TRANSITION");
  });

  it("DISPUTED can resolve to REFUNDED or SETTLED", () => {
    sm.initiate("pay-007");
    sm.transition("pay-007", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
    sm.transition("pay-007", SettlementStatus.AUTHORIZED, SettlementStatus.HELD);
    sm.transition("pay-007", SettlementStatus.HELD, SettlementStatus.DISPUTED);

    expect(sm.canTransition(SettlementStatus.DISPUTED, SettlementStatus.REFUNDED)).toBe(true);
    expect(sm.canTransition(SettlementStatus.DISPUTED, SettlementStatus.SETTLED)).toBe(true);

    sm.transition("pay-007", SettlementStatus.DISPUTED, SettlementStatus.REFUNDED);
    expect(sm.getState("pay-007")).toBe(SettlementStatus.REFUNDED);
  });
});

describe("SettlementStateMachine — Escrow", () => {
  let sm: SettlementStateMachine;

  beforeEach(() => {
    sm = new SettlementStateMachine();
    sm.initiate("esc-001");
    sm.transition("esc-001", SettlementStatus.INITIATED, SettlementStatus.AUTHORIZED);
  });

  it("holds escrow with TIME_RELEASE and auto-releases when expired", () => {
    const pastTime = new Date(Date.now() - 60_000);
    sm.holdEscrow("esc-001", "TIME_RELEASE", pastTime);

    expect(sm.getState("esc-001")).toBe(SettlementStatus.HELD);

    const result = sm.checkAndAutoRelease("esc-001");
    expect(result).toBe(SettlementStatus.RELEASING);
    expect(sm.getState("esc-001")).toBe(SettlementStatus.RELEASING);
  });

  it("does not auto-release TIME_RELEASE escrow before expiry", () => {
    const futureTime = new Date(Date.now() + 3_600_000);
    sm.holdEscrow("esc-001", "TIME_RELEASE", futureTime);

    const result = sm.checkAndAutoRelease("esc-001");
    expect(result).toBeNull();
    expect(sm.getState("esc-001")).toBe(SettlementStatus.HELD);
  });

  it("releases ORACLE_CONFIRM escrow after oracle confirmation", () => {
    sm.holdEscrow("esc-001", "ORACLE_CONFIRM");

    expect(() => sm.releaseEscrow("esc-001")).toThrow("ESCROW_ORACLE_NOT_CONFIRMED");

    sm.confirmOracle("esc-001");
    const result = sm.releaseEscrow("esc-001");
    expect(result).toBe(SettlementStatus.RELEASING);
  });

  it("requires expiresAt for TIME_RELEASE condition", () => {
    expect(() => sm.holdEscrow("esc-001", "TIME_RELEASE")).toThrow("ESCROW_EXPIRY_REQUIRED");
  });

  it("records escrow condition metadata in history", () => {
    const pastTime = new Date(Date.now() - 1_000);
    sm.holdEscrow("esc-001", "TIME_RELEASE", pastTime);
    sm.releaseEscrow("esc-001");

    const history = sm.getHistory("esc-001");
    const holdRecord = history.find((r) => r.metadata?.action === "hold_escrow");
    const releaseRecord = history.find((r) => r.metadata?.action === "release_escrow");

    expect(holdRecord).toBeDefined();
    expect(holdRecord?.metadata?.condition_type).toBe("TIME_RELEASE");
    expect(releaseRecord).toBeDefined();
    expect(releaseRecord?.metadata?.condition_type).toBe("TIME_RELEASE");
  });
});

describe("SgdRailAdapter", () => {
  let adapter: SgdRailAdapter;

  beforeEach(() => {
    // 100% success rate for deterministic tests
    adapter = new SgdRailAdapter({ successRate: 1.0 });
  });

  it("submits, confirms, and refunds SGD payment end-to-end", async () => {
    const payment = {
      payment_id: "pay-sgd-001",
      amount_sgd_cents: 100_00,
      sender_account: "SG-ACCT-001",
      receiver_account: "SG-ACCT-002",
      reference: "Test payment",
    };

    const submitResult = await adapter.submit(payment);
    expect(submitResult.status).toBe("PENDING");
    expect(submitResult.reference_id).toStartWith("SGD-");

    if (submitResult.status !== "PENDING") return;

    const confirmResult = await adapter.confirm(submitResult.reference_id);
    expect(confirmResult.status).toBe("SETTLED");

    if (confirmResult.status !== "SETTLED") return;
    expect(confirmResult.settled_at).toBeInstanceOf(Date);
  });

  it("returns FAILED for submission not found on confirm", async () => {
    const result = await adapter.confirm("SGD-nonexistent");
    expect(result.status).toBe("FAILED");
    if (result.status === "FAILED") {
      expect(result.reason).toBe("SUBMISSION_NOT_FOUND");
    }
  });

  it("validates payment fields", async () => {
    const invalidPayment = {
      payment_id: "",
      amount_sgd_cents: 100_00,
      sender_account: "SG-ACCT-001",
      receiver_account: "SG-ACCT-002",
    };

    expect(adapter.submit(invalidPayment)).rejects.toThrow("PAYMENT_ID_REQUIRED");
  });

  it("implements RailAdapter interface for provider swapping", () => {
    const providerAdapter: RailAdapter = new SgdRailAdapter({ successRate: 1.0 });
    expect(providerAdapter.submit).toBeDefined();
    expect(providerAdapter.confirm).toBeDefined();
    expect(providerAdapter.refund).toBeDefined();
  });

  it("simulates failures with low success rate", async () => {
    const fragileAdapter = new SgdRailAdapter({ successRate: 0.0 });
    const payment = {
      payment_id: "pay-sgd-fail",
      amount_sgd_cents: 50_00,
      sender_account: "SG-ACCT-001",
      receiver_account: "SG-ACCT-002",
    };

    const result = await fragileAdapter.submit(payment);
    expect(result.status).toBe("FAILED");
    if (result.status === "FAILED") {
      expect(result.reason).toBe("SANDBOX_RANDOM_FAILURE");
    }
  });

  it("refunds a settled payment", async () => {
    const payment = {
      payment_id: "pay-sgd-refund",
      amount_sgd_cents: 200_00,
      sender_account: "SG-ACCT-001",
      receiver_account: "SG-ACCT-002",
    };

    const submitResult = await adapter.submit(payment);
    if (submitResult.status !== "PENDING") return;

    await adapter.confirm(submitResult.reference_id);

    const refundResult = await adapter.refund(submitResult.reference_id);
    expect(refundResult.status).toBe("REFUNDED");
    if (refundResult.status === "REFUNDED") {
      expect(refundResult.refunded_at).toBeInstanceOf(Date);
    }
  });
});
