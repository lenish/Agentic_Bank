import { beforeEach, describe, expect, it } from "bun:test";

import { SIGNING_EVENT, SigningService, STEP_UP_SIGNING_THRESHOLD_SGD_CENTS } from "./signing";

describe("SigningService", () => {
  let service: SigningService;
  const keyId = "sgd-settlement-key";

  beforeEach(() => {
    service = new SigningService();
    service.generateKeyPair(keyId);
  });

  it("signs and verifies when policy is approved", () => {
    const payload = { amount_sgd_cents: 500_00, tx_id: "tx-001" };

    const signed = service.sign(keyId, payload, true);
    const verified = service.verify(keyId, payload, signed.signature);

    expect(signed.algorithm).toBe("ed25519");
    expect(signed.keyVersion).toBe(1);
    expect(verified).toBe(true);
  });

  it("rejects signing when policy is not approved", () => {
    const payload = { amount_sgd_cents: 500_00, tx_id: "tx-002" };

    expect(() => service.sign(keyId, payload, false)).toThrow("POLICY_NOT_APPROVED");
  });

  it("requires step-up token for high-value amount", () => {
    const payload = { amount_sgd_cents: 5_000_000, tx_id: "tx-003" };

    expect(() => service.sign(keyId, payload, true)).toThrow("STEP_UP_REQUIRED");
  });

  it("allows high-value signing when step-up token is provided", () => {
    const payload = { amount_sgd_cents: 5_000_000, tx_id: "tx-004" };

    const signed = service.sign(keyId, payload, true, "step-up-token-1");
    const verified = service.verify(keyId, payload, signed.signature);

    expect(verified).toBe(true);
  });

  it("does not verify for tampered payload", () => {
    const payload = { amount_sgd_cents: 500_00, tx_id: "tx-005" };
    const signed = service.sign(keyId, payload, true);

    const tamperedPayload = { ...payload, tx_id: "tx-005-tampered" };
    const verified = service.verify(keyId, tamperedPayload, signed.signature);

    expect(verified).toBe(false);
  });

  it("keeps old signature verifiable after key rotation", () => {
    const payload = { amount_sgd_cents: 900_00, tx_id: "tx-006" };
    const oldSignature = service.sign(keyId, payload, true).signature;

    service.rotateKey(keyId);

    const verified = service.verify(keyId, payload, oldSignature);
    expect(verified).toBe(true);
  });

  it("uses new key version after rotation", () => {
    const payload = { amount_sgd_cents: 700_00, tx_id: "tx-007" };

    service.rotateKey(keyId);
    const signed = service.sign(keyId, payload, true);

    expect(signed.keyVersion).toBe(2);
    expect(service.verify(keyId, payload, signed.signature)).toBe(true);
  });

  it("writes append-only signing log entries", () => {
    const payload = {
      amount_sgd_cents: STEP_UP_SIGNING_THRESHOLD_SGD_CENTS + 1,
      tx_id: "tx-008",
    };

    const signed = service.sign(keyId, payload, true, "step-up-token-2");
    service.verify(keyId, payload, signed.signature);
    service.rotateKey(keyId);

    const log = service.getSigningLog();

    expect(log.length).toBe(4);
    expect(log[0]?.event).toBe(SIGNING_EVENT.GENERATED);
    expect(log[1]?.event).toBe(SIGNING_EVENT.SIGNED);
    expect(log[2]?.event).toBe(SIGNING_EVENT.VERIFIED);
    expect(log[3]?.event).toBe(SIGNING_EVENT.ROTATED);
  });

  it("rejects duplicate key generation", () => {
    expect(() => service.generateKeyPair(keyId)).toThrow("SIGNING_KEY_ALREADY_EXISTS");
  });

  it("fails for unknown key operations", () => {
    const payload = { amount_sgd_cents: 100_00, tx_id: "tx-009" };

    expect(() => service.sign("missing-key", payload, true)).toThrow("SIGNING_KEY_NOT_FOUND");
    expect(() => service.rotateKey("missing-key")).toThrow("SIGNING_KEY_NOT_FOUND");
    expect(() => service.verify("missing-key", payload, "Zm9v")).toThrow("SIGNING_KEY_NOT_FOUND");
  });
});
