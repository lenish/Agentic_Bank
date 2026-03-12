import { describe, test, expect, beforeEach } from "bun:test";
import { AmlEngine } from "./aml";
import type { AmlEvalInput } from "./aml";

function makeInput(overrides?: Partial<AmlEvalInput>): AmlEvalInput {
  return {
    agent_id: "agent-payment-001",
    amount_sgd_cents: 500_000, // 5,000 SGD — normal
    counterparty_id: "cpty-001",
    timestamp: new Date(),
    ...overrides,
  };
}

describe("AmlEngine", () => {
  let engine: AmlEngine;

  beforeEach(() => {
    engine = new AmlEngine();
  });

  // =========================================================================
  // Rule 1: Structuring detection
  // =========================================================================

  test("ALRT on structuring: 5+ txns each < 10k SGD but total > 9k SGD", () => {
    const input = makeInput({
      transaction_history: {
        last_hour_amounts: [
          190_000, // 1,900 SGD
          185_000, // 1,850 SGD
          200_000, // 2,000 SGD
          180_000, // 1,800 SGD
          170_000, // 1,700 SGD — total 9,250 SGD > 9,000 SGD
        ],
        last_hour_count: 5,
      },
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("ALRT");
    expect(result.typology).toBe("structuring");
    expect(result.reason_codes).toContain("AML_STRUCTURING_DETECTED");
    expect(result.case_id).toBeDefined();
    expect(result.case_id!.startsWith("AML-")).toBe(true);
  });

  test("NALT when under 5 transactions (no structuring)", () => {
    const input = makeInput({
      transaction_history: {
        last_hour_amounts: [190_000, 185_000, 200_000, 180_000], // only 4
        last_hour_count: 4,
      },
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("NALT");
    expect(result.typology).toBeUndefined();
    expect(result.reason_codes).toContain("AML_CHECK_PASS");
  });

  // =========================================================================
  // Rule 2: Account Takeover detection
  // =========================================================================

  test("ALRT on account takeover: 3+ counterparties for same agent", () => {
    // First two different counterparties — no alert yet
    const r1 = engine.evaluate(makeInput({ counterparty_id: "cpty-A" }));
    expect(r1.status).toBe("NALT");

    const r2 = engine.evaluate(makeInput({ counterparty_id: "cpty-B" }));
    expect(r2.status).toBe("NALT");

    // Third unique counterparty → trigger
    const r3 = engine.evaluate(makeInput({ counterparty_id: "cpty-C" }));
    expect(r3.status).toBe("ALRT");
    expect(r3.typology).toBe("account_takeover");
    expect(r3.reason_codes).toContain("AML_ACCOUNT_TAKEOVER_DETECTED");
  });

  // =========================================================================
  // Rule 3: Mule Activity detection
  // =========================================================================

  test("ALRT on mule activity: > 50k SGD to unknown counterparty", () => {
    const input = makeInput({
      amount_sgd_cents: 5_100_000, // 51,000 SGD
      counterparty_id: "unknown-xyz-789",
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("ALRT");
    expect(result.typology).toBe("mule_activity");
    expect(result.reason_codes).toContain("AML_MULE_ACTIVITY_DETECTED");
  });

  test("NALT when amount > 50k SGD but counterparty is known", () => {
    const input = makeInput({
      amount_sgd_cents: 5_100_000,
      counterparty_id: "known-merchant-001",
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("NALT");
  });

  // =========================================================================
  // Rule 4: Rapid Movement detection
  // =========================================================================

  test("ALRT on rapid movement: > 10 transactions in last hour", () => {
    const input = makeInput({
      transaction_history: {
        last_hour_amounts: [100, 200, 300],
        last_hour_count: 11, // > 10
      },
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("ALRT");
    expect(result.typology).toBe("rapid_movement");
    expect(result.reason_codes).toContain("AML_RAPID_MOVEMENT_DETECTED");
  });

  // =========================================================================
  // Manual review queue
  // =========================================================================

  test("ALRT creates case in review queue; resolveCase marks REVIEWED", () => {
    const input = makeInput({
      amount_sgd_cents: 5_100_000,
      counterparty_id: "unknown-abc",
    });

    const result = engine.evaluate(input);
    expect(result.status).toBe("ALRT");

    const caseId = result.case_id as string;
    expect(caseId).toBeDefined();
    expect(caseId.startsWith("AML-")).toBe(true);

    const queue = engine.getReviewQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].case_id).toBe(caseId);
    expect(queue[0].status).toBe("PENDING_REVIEW");
    expect(queue[0].typology).toBe("mule_activity");

    engine.resolveCase(caseId);

    // Queue should be empty (no PENDING_REVIEW cases)
    expect(engine.getReviewQueue().length).toBe(0);
  });

  test("resolveCase throws for unknown case_id", () => {
    expect(() => engine.resolveCase("AML-NONEXIST")).toThrow(
      "AML_CASE_NOT_FOUND"
    );
  });

  // =========================================================================
  // ISO 20022 pain.001 validation
  // =========================================================================

  test("ISO 20022 pain.001 valid message passes without error", () => {
    const input = makeInput({
      iso20022_pain001: {
        originator_name: "Alice Corp",
        originator_account: "SG1234567890",
        beneficiary_name: "Bob Ltd",
        beneficiary_account: "SG0987654321",
        amount: 5000,
        currency: "SGD",
      },
    });

    const result = engine.evaluate(input);
    // Should evaluate normally (no pain.001 validation error)
    expect(result.status).toBe("NALT");
    expect(result.evaluated_at).toBeInstanceOf(Date);
  });

  test("ISO 20022 pain.001 missing originator_name throws", () => {
    const input = makeInput({
      iso20022_pain001: {
        originator_name: "",
        originator_account: "SG1234567890",
        beneficiary_name: "Bob Ltd",
        beneficiary_account: "SG0987654321",
        amount: 5000,
        currency: "SGD",
      },
    });

    expect(() => engine.evaluate(input)).toThrow(
      "AML_PAIN001_ORIGINATOR_NAME_REQUIRED"
    );
  });

  test("ISO 20022 pain.001 missing currency throws", () => {
    const input = makeInput({
      iso20022_pain001: {
        originator_name: "Alice Corp",
        originator_account: "SG1234567890",
        beneficiary_name: "Bob Ltd",
        beneficiary_account: "SG0987654321",
        amount: 5000,
        currency: "",
      },
    });

    expect(() => engine.evaluate(input)).toThrow(
      "AML_PAIN001_CURRENCY_REQUIRED"
    );
  });

  // =========================================================================
  // Input validation
  // =========================================================================

  test("throws on empty agent_id", () => {
    expect(() => engine.evaluate(makeInput({ agent_id: "  " }))).toThrow(
      "AML_AGENT_ID_REQUIRED"
    );
  });

  test("throws on invalid amount", () => {
    expect(() =>
      engine.evaluate(makeInput({ amount_sgd_cents: -100 }))
    ).toThrow("AML_AMOUNT_INVALID");
  });

  // =========================================================================
  // NALT path — clean transaction
  // =========================================================================

  test("NALT for clean normal transaction", () => {
    const result = engine.evaluate(makeInput());
    expect(result.status).toBe("NALT");
    expect(result.typology).toBeUndefined();
    expect(result.reason_codes).toEqual(["AML_CHECK_PASS"]);
    expect(result.case_id).toBeUndefined();
    expect(result.evaluated_at).toBeInstanceOf(Date);
  });
});
