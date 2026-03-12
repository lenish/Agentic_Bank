import { beforeEach, describe, expect, it } from "bun:test";
import {
  CAPABILITY_AUDIT_EVENT,
  CapabilityTokenService,
  type CapabilityIssueInput,
} from "./capability";

const BASE_ISSUE_INPUT: CapabilityIssueInput = {
  agent_id: "agent-001",
  principal_id: "owner-001",
  action_set: ["TRANSFER", "QUERY_BALANCE"],
  amount_limit_sgd_cents: 100_000,
  counterparty_scope: ["merchant-1", "merchant-2"],
  ttl_seconds: 60,
  max_frequency_per_hour: 2,
  revocable: true,
};

describe("CapabilityTokenService", () => {
  let service: CapabilityTokenService;

  beforeEach(() => {
    service = new CapabilityTokenService();
  });

  it("issues capability with enforced non-transferable bound", () => {
    const issued = service.issue(BASE_ISSUE_INPUT, "owner-001");

    expect(issued.id.length).toBeGreaterThan(0);
    expect(issued.non_transferable).toBe(true);
    expect(issued.status).toBe("ACTIVE");
    expect(issued.expires_at.getTime()).toBeGreaterThan(issued.issued_at.getTime());

    const audit = service.getAuditLog(issued.id);
    expect(audit.length).toBe(1);
    expect(audit[0]?.event).toBe(CAPABILITY_AUDIT_EVENT.ISSUED);
  });

  it("rejects issuance when caller tries non_transferable=false", () => {
    expect(() =>
      service.issue({
        ...BASE_ISSUE_INPUT,
        non_transferable: false,
      }),
    ).toThrow("CAPABILITY_NON_TRANSFERABLE_REQUIRED");
  });

  it("verifies allowed action and records usage audit", () => {
    const issued = service.issue(BASE_ISSUE_INPUT);

    const verified = service.verify({
      capability_id: issued.id,
      action: "TRANSFER",
      amount_sgd_cents: 50_000,
      counterparty_id: "merchant-1",
      actor: "agent-001",
    });

    expect(verified.id).toBe(issued.id);
    expect(service.getUsedAmount(issued.id)).toBe(50_000);

    const audit = service.getAuditLog(issued.id);
    expect(audit.map((entry) => entry.event)).toEqual(["ISSUED", "USED"]);
  });

  it("blocks when cumulative amount would exceed limit", () => {
    const issued = service.issue(BASE_ISSUE_INPUT);

    service.verify({
      capability_id: issued.id,
      action: "TRANSFER",
      amount_sgd_cents: 50_000,
      counterparty_id: "merchant-1",
    });

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "TRANSFER",
        amount_sgd_cents: 60_000,
        counterparty_id: "merchant-1",
      }),
    ).toThrow("CAPABILITY_AMOUNT_EXCEEDED");
  });

  it("blocks once max frequency per hour is exceeded", () => {
    const issued = service.issue({
      ...BASE_ISSUE_INPUT,
      amount_limit_sgd_cents: 500_000,
      max_frequency_per_hour: 1,
    });

    service.verify({
      capability_id: issued.id,
      action: "TRANSFER",
      amount_sgd_cents: 10_000,
      counterparty_id: "merchant-1",
    });

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "TRANSFER",
        amount_sgd_cents: 10_000,
        counterparty_id: "merchant-1",
      }),
    ).toThrow("CAPABILITY_FREQUENCY_EXCEEDED");
  });

  it("blocks unknown action outside action_set", () => {
    const issued = service.issue(BASE_ISSUE_INPUT);

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "WITHDRAWAL",
        amount_sgd_cents: 10_000,
        counterparty_id: "merchant-1",
      }),
    ).toThrow("CAPABILITY_ACTION_NOT_ALLOWED");
  });

  it("blocks counterparty outside counterparty_scope", () => {
    const issued = service.issue(BASE_ISSUE_INPUT);

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "TRANSFER",
        amount_sgd_cents: 10_000,
        counterparty_id: "merchant-9",
      }),
    ).toThrow("CAPABILITY_COUNTERPARTY_NOT_ALLOWED");
  });

  it("expires capability and rejects verification after ttl", async () => {
    const issued = service.issue({
      ...BASE_ISSUE_INPUT,
      ttl_seconds: 1,
    });

    await Bun.sleep(2_000);

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "TRANSFER",
        amount_sgd_cents: 10_000,
        counterparty_id: "merchant-1",
      }),
    ).toThrow("CAPABILITY_EXPIRED");

    const audit = service.getAuditLog(issued.id);
    expect(audit.some((entry) => entry.event === CAPABILITY_AUDIT_EVENT.EXPIRED)).toBe(true);
  });

  it("revokes capability immediately and blocks further use", () => {
    const issued = service.issue(BASE_ISSUE_INPUT);

    const revoked = service.revoke(issued.id, "owner-001");
    expect(revoked.status).toBe("REVOKED");

    expect(() =>
      service.verify({
        capability_id: issued.id,
        action: "TRANSFER",
        amount_sgd_cents: 1_000,
        counterparty_id: "merchant-1",
      }),
    ).toThrow("CAPABILITY_REVOKED");

    const audit = service.getAuditLog(issued.id);
    expect(audit.map((entry) => entry.event)).toEqual(["ISSUED", "REVOKED"]);
  });

  it("rejects revoke when capability is marked non-revocable", () => {
    const issued = service.issue({
      ...BASE_ISSUE_INPUT,
      revocable: false,
    });

    expect(() => service.revoke(issued.id)).toThrow("CAPABILITY_NOT_REVOCABLE");
  });
});
