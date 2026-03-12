import { describe, test, expect, beforeEach } from "bun:test";
import {
  TravelRuleService,
  MockRailAdapter,
} from "./travel-rule";
import type { IVMS101Payload, RailAdapter } from "./travel-rule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePayload(overrides?: Partial<IVMS101Payload>): IVMS101Payload {
  return {
    originator: {
      name: "Alice Tan",
      account_number: "SG-001-ALICE",
      address: "123 Orchard Road, Singapore",
      national_id: "S1234567A",
    },
    beneficiary: {
      name: "Bob Lee",
      account_number: "SG-002-BOB",
      address: "456 Marina Bay, Singapore",
    },
    amount_sgd_cents: 200_000, // 2,000 SGD — above threshold
    currency: "SGD",
    transaction_date: new Date("2026-03-12T10:00:00Z"),
    reference: "PAY-001",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MockRailAdapter tests
// ---------------------------------------------------------------------------

describe("MockRailAdapter", () => {
  let adapter: MockRailAdapter;

  beforeEach(() => {
    adapter = new MockRailAdapter();
  });

  test("connect() resolves without error", async () => {
    await expect(adapter.connect()).resolves.toBeUndefined();
  });

  test("sendTravelRuleData() returns SENT with reference_id for valid payload", async () => {
    const payload = makePayload();
    const result = await adapter.sendTravelRuleData(payload);

    expect(result.status).toBe("SENT");
    expect(result.reference_id).toBeTruthy();
    expect(typeof result.reference_id).toBe("string");
  });

  test("verifyCounterparty() returns verified=true with Mock VASP", async () => {
    const result = await adapter.verifyCounterparty("SG-002-BOB");

    expect(result.verified).toBe(true);
    expect(result.vasp_name).toBe("Mock VASP");
  });
});

// ---------------------------------------------------------------------------
// TravelRuleService — evaluate()
// ---------------------------------------------------------------------------

describe("TravelRuleService", () => {
  let service: TravelRuleService;
  let adapter: MockRailAdapter;

  beforeEach(() => {
    adapter = new MockRailAdapter();
    service = new TravelRuleService(adapter);
  });

  // =========================================================================
  // QA Scenario 1: Below threshold → Travel Rule skipped
  // =========================================================================

  test("evaluate: 1,000 SGD (100_000 cents) → Travel Rule not required", async () => {
    const payload = makePayload({ amount_sgd_cents: 100_000 });
    const result = await service.evaluate(100_000, payload);

    expect(result.required).toBe(false);
  });

  test("evaluate: exactly at threshold boundary (149_999 cents) → not required", async () => {
    const payload = makePayload({ amount_sgd_cents: 149_999 });
    const result = await service.evaluate(149_999, payload);

    expect(result.required).toBe(false);
  });

  // =========================================================================
  // QA Scenario 2: At/above threshold → Travel Rule data sent
  // =========================================================================

  test("evaluate: 2,000 SGD (200_000 cents) → Travel Rule required, SENT", async () => {
    const payload = makePayload({ amount_sgd_cents: 200_000 });
    const result = await service.evaluate(200_000, payload);

    expect(result.required).toBe(true);
    if (result.required) {
      expect(result.status).toBe("SENT");
      expect(result.reference_id).toBeTruthy();
    }
  });

  test("evaluate: exactly at threshold (150_000 cents) → Travel Rule required", async () => {
    const payload = makePayload({ amount_sgd_cents: 150_000 });
    const result = await service.evaluate(150_000, payload);

    expect(result.required).toBe(true);
    if (result.required) {
      expect(result.status).toBe("SENT");
    }
  });

  // =========================================================================
  // QA Scenario 3: Missing originator.name → validation error
  // =========================================================================

  test("evaluate: missing originator.name → throws validation error", async () => {
    const payload = makePayload();
    payload.originator.name = "";

    await expect(service.evaluate(200_000, payload)).rejects.toThrow(
      "TRAVEL_RULE_ORIGINATOR_NAME_REQUIRED"
    );
  });

  test("evaluate: missing beneficiary.account_number → throws validation error", async () => {
    const payload = makePayload();
    payload.beneficiary.account_number = "";

    await expect(service.evaluate(200_000, payload)).rejects.toThrow(
      "TRAVEL_RULE_BENEFICIARY_ACCOUNT_REQUIRED"
    );
  });

  // =========================================================================
  // validate() — direct tests
  // =========================================================================

  test("validate: valid payload passes without error", () => {
    const payload = makePayload();
    expect(() => service.validate(payload)).not.toThrow();
  });

  test("validate: missing originator.account_number throws", () => {
    const payload = makePayload();
    payload.originator.account_number = "";

    expect(() => service.validate(payload)).toThrow(
      "TRAVEL_RULE_ORIGINATOR_ACCOUNT_REQUIRED"
    );
  });

  test("validate: missing beneficiary.name throws", () => {
    const payload = makePayload();
    payload.beneficiary.name = "   ";

    expect(() => service.validate(payload)).toThrow(
      "TRAVEL_RULE_BENEFICIARY_NAME_REQUIRED"
    );
  });

  test("validate: invalid amount (non-integer) throws", () => {
    const payload = makePayload({ amount_sgd_cents: 150.5 });

    expect(() => service.validate(payload)).toThrow(
      "TRAVEL_RULE_AMOUNT_INVALID"
    );
  });

  test("validate: invalid transaction_date throws", () => {
    const payload = makePayload({
      transaction_date: new Date("invalid-date"),
    });

    expect(() => service.validate(payload)).toThrow(
      "TRAVEL_RULE_DATE_INVALID"
    );
  });

  // =========================================================================
  // Zero-PII-at-Rest: verify no payload retention
  // =========================================================================

  test("evaluate: does not store payload in service after sending", async () => {
    const payload = makePayload({ amount_sgd_cents: 200_000 });
    const result = await service.evaluate(200_000, payload);

    expect(result.required).toBe(true);
    // Service should only have adapter reference — no PII properties
    const serviceKeys = Object.keys(service);
    const hasPayloadKey = serviceKeys.some(
      (k) =>
        k.includes("payload") ||
        k.includes("originator") ||
        k.includes("beneficiary")
    );
    expect(hasPayloadKey).toBe(false);
  });

  // =========================================================================
  // E2E: send + verify with mock adapter
  // =========================================================================

  test("E2E: send travel rule data and verify counterparty with mock adapter", async () => {
    await adapter.connect();

    // Step 1: verify counterparty
    const verification = await adapter.verifyCounterparty("SG-002-BOB");
    expect(verification.verified).toBe(true);

    // Step 2: evaluate and send travel rule data
    const payload = makePayload({ amount_sgd_cents: 300_000 }); // 3,000 SGD
    const result = await service.evaluate(300_000, payload);

    expect(result.required).toBe(true);
    if (result.required) {
      expect(result.status).toBe("SENT");
      expect(result.reference_id).toBeTruthy();
      // Verify reference_id is a valid UUID format
      expect(result.reference_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    }
  });
});
