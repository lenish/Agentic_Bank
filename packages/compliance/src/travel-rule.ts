import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types — IVMS101 Travel Rule schema (MAS PSA compliance)
// ---------------------------------------------------------------------------

/**
 * IVMS101 payload for Travel Rule data transmission.
 * Contains originator/beneficiary PII — must NOT be stored at rest
 * after successful transmission (Zero-PII-at-Rest policy).
 */
export interface IVMS101Payload {
  originator: {
    name: string;
    account_number: string;
    address?: string;
    national_id?: string;
  };
  beneficiary: {
    name: string;
    account_number: string;
    address?: string;
  };
  amount_sgd_cents: number;
  currency: "SGD";
  transaction_date: Date;
  reference?: string;
}

export interface RailSendResult {
  status: "SENT" | "FAILED";
  reference_id: string;
}

export interface CounterpartyVerification {
  verified: boolean;
  vasp_name?: string;
}

/**
 * RailAdapter — abstract interface for Travel Rule data transmission.
 * Implementations connect to specific Travel Rule providers (e.g. Notabene,
 * Shyft, TRP). This interface-only approach avoids vendor lock-in.
 */
export interface RailAdapter {
  connect(): Promise<void>;
  sendTravelRuleData(payload: IVMS101Payload): Promise<RailSendResult>;
  verifyCounterparty(
    accountNumber: string
  ): Promise<CounterpartyVerification>;
}

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

/** Travel Rule threshold: 1,500 SGD = 150,000 cents */
const TRAVEL_RULE_THRESHOLD_CENTS = 150_000;

// ---------------------------------------------------------------------------
// TravelRuleEvalResult
// ---------------------------------------------------------------------------

export type TravelRuleEvalResult =
  | { required: false }
  | { required: true; status: "SENT" | "FAILED"; reference_id: string };

// ---------------------------------------------------------------------------
// MockRailAdapter — for testing and sandbox environments
// ---------------------------------------------------------------------------

export class MockRailAdapter implements RailAdapter {
  async connect(): Promise<void> {
    // Mock: always resolves — no real network connection
  }

  async sendTravelRuleData(payload: IVMS101Payload): Promise<RailSendResult> {
    // Validate required fields before "sending"
    if (!payload.originator.name?.trim()) {
      return { status: "FAILED", reference_id: "" };
    }
    if (!payload.originator.account_number?.trim()) {
      return { status: "FAILED", reference_id: "" };
    }
    if (!payload.beneficiary.name?.trim()) {
      return { status: "FAILED", reference_id: "" };
    }
    if (!payload.beneficiary.account_number?.trim()) {
      return { status: "FAILED", reference_id: "" };
    }

    return {
      status: "SENT",
      reference_id: randomUUID(),
    };
  }

  async verifyCounterparty(
    _accountNumber: string
  ): Promise<CounterpartyVerification> {
    return { verified: true, vasp_name: "Mock VASP" };
  }
}

// ---------------------------------------------------------------------------
// TravelRuleService
// ---------------------------------------------------------------------------

/**
 * TravelRuleService — evaluates whether Travel Rule applies to a transaction
 * and transmits IVMS101 data when required.
 *
 * MAS/FATF Travel Rule: transactions at or above 1,500 SGD (150,000 cents)
 * must include originator and beneficiary identification data.
 *
 * Zero-PII-at-Rest: after sending, only reference_id is retained.
 * The payload is NOT stored in memory.
 */
export class TravelRuleService {
  private readonly adapter: RailAdapter;

  constructor(adapter: RailAdapter) {
    this.adapter = adapter;
  }

  /**
   * Evaluate whether Travel Rule applies to a transaction.
   *
   * @param amount_sgd_cents — transaction amount in SGD cents (integer)
   * @param payload — IVMS101 payload with originator/beneficiary data
   * @returns evaluation result with required flag and send status
   */
  async evaluate(
    amount_sgd_cents: number,
    payload: IVMS101Payload
  ): Promise<TravelRuleEvalResult> {
    // Below threshold → Travel Rule not required
    if (amount_sgd_cents < TRAVEL_RULE_THRESHOLD_CENTS) {
      return { required: false };
    }

    // At or above threshold → validate and send
    this.validate(payload);

    const result = await this.adapter.sendTravelRuleData(payload);

    // Zero-PII-at-Rest: we intentionally do NOT store the payload.
    // Only the reference_id is returned to the caller.
    return {
      required: true,
      status: result.status,
      reference_id: result.reference_id,
    };
  }

  /**
   * Validate required IVMS101 fields.
   * Throws descriptive error if any required field is missing or empty.
   */
  validate(payload: IVMS101Payload): void {
    if (!payload.originator) {
      throw new Error("TRAVEL_RULE_ORIGINATOR_REQUIRED");
    }
    if (!payload.originator.name?.trim()) {
      throw new Error("TRAVEL_RULE_ORIGINATOR_NAME_REQUIRED");
    }
    if (!payload.originator.account_number?.trim()) {
      throw new Error("TRAVEL_RULE_ORIGINATOR_ACCOUNT_REQUIRED");
    }

    if (!payload.beneficiary) {
      throw new Error("TRAVEL_RULE_BENEFICIARY_REQUIRED");
    }
    if (!payload.beneficiary.name?.trim()) {
      throw new Error("TRAVEL_RULE_BENEFICIARY_NAME_REQUIRED");
    }
    if (!payload.beneficiary.account_number?.trim()) {
      throw new Error("TRAVEL_RULE_BENEFICIARY_ACCOUNT_REQUIRED");
    }

    if (
      !Number.isInteger(payload.amount_sgd_cents) ||
      payload.amount_sgd_cents <= 0
    ) {
      throw new Error("TRAVEL_RULE_AMOUNT_INVALID");
    }

    if (payload.currency !== "SGD") {
      throw new Error("TRAVEL_RULE_CURRENCY_MUST_BE_SGD");
    }

    if (
      !(payload.transaction_date instanceof Date) ||
      Number.isNaN(payload.transaction_date.getTime())
    ) {
      throw new Error("TRAVEL_RULE_DATE_INVALID");
    }
  }
}
