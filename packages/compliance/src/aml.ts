import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AmlEvalInput {
  agent_id: string;
  amount_sgd_cents: number;
  counterparty_id: string;
  timestamp: Date;
  transaction_history?: {
    last_hour_amounts: number[]; // amounts of transactions in last hour
    last_hour_count: number;
  };
  iso20022_pain001?: {
    originator_name: string;
    originator_account: string;
    beneficiary_name: string;
    beneficiary_account: string;
    amount: number;
    currency: string;
  };
}

export type AmlTypology =
  | "structuring"
  | "account_takeover"
  | "mule_activity"
  | "rapid_movement";

export interface AmlEvalResult {
  status: "ALRT" | "NALT";
  typology?: AmlTypology;
  reason_codes: string[];
  case_id?: string; // set when ALRT, for manual review queue
  evaluated_at: Date;
}

export type AmlCaseStatus = "PENDING_REVIEW" | "REVIEWED";

export interface AmlCase {
  case_id: string;
  agent_id: string;
  typology: string;
  status: AmlCaseStatus;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Thresholds (SGD cents)
// ---------------------------------------------------------------------------

/** Structuring: individual transaction must be below this (10,000 SGD) */
const STRUCTURING_INDIVIDUAL_THRESHOLD = 1_000_000;
/** Structuring: total must exceed this (9,000 SGD) */
const STRUCTURING_TOTAL_THRESHOLD = 900_000;
/** Structuring: minimum number of transactions in the window */
const STRUCTURING_MIN_TX_COUNT = 5;

/** Mule activity: amount threshold (50,000 SGD) */
const MULE_AMOUNT_THRESHOLD = 5_000_000;
/** Mule activity: counterparty prefix for unknown entities */
const MULE_UNKNOWN_PREFIX = "unknown-";

/** Rapid movement: maximum transactions per hour before alert */
const RAPID_MOVEMENT_MAX_TX = 10;

/** Account takeover: unique counterparties in a window to trigger alert */
const ACCOUNT_TAKEOVER_COUNTERPARTY_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// AML Engine
// ---------------------------------------------------------------------------

/**
 * AML Rule Engine v1 — evaluates transactions against FATF typology rules.
 *
 * Four rules:
 *  1. Structuring: many small transactions just under reporting threshold
 *  2. Account Takeover: same agent, multiple counterparties in short window
 *  3. Mule Activity: large amount to unknown counterparty
 *  4. Rapid Movement: unusually high transaction frequency
 *
 * When an alert (ALRT) is raised, a case is created in the manual review
 * queue for human review. No automatic SAR submission — human review is
 * mandatory per design.
 */
export class AmlEngine {
  private readonly reviewQueue = new Map<string, AmlCase>();

  // Track unique counterparties per agent for account-takeover detection
  private readonly agentCounterparties = new Map<string, Set<string>>();

  /**
   * Evaluate a transaction against all AML typology rules.
   * Returns the first triggered rule (priority order: structuring → account
   * takeover → mule activity → rapid movement). If none trigger, returns NALT.
   */
  evaluate(input: AmlEvalInput): AmlEvalResult {
    this.validateInput(input);
    this.validatePain001(input);

    // Track counterparty for account-takeover detection
    this.trackCounterparty(input.agent_id, input.counterparty_id);

    const reasonCodes: string[] = [];
    const evaluatedAt = new Date();

    // Rule 1: Structuring detection
    if (this.isStructuring(input)) {
      const caseId = this.createCase(input.agent_id, "structuring");
      return {
        status: "ALRT",
        typology: "structuring",
        reason_codes: ["AML_STRUCTURING_DETECTED"],
        case_id: caseId,
        evaluated_at: evaluatedAt,
      };
    }

    // Rule 2: Account Takeover detection
    if (this.isAccountTakeover(input.agent_id)) {
      const caseId = this.createCase(input.agent_id, "account_takeover");
      return {
        status: "ALRT",
        typology: "account_takeover",
        reason_codes: ["AML_ACCOUNT_TAKEOVER_DETECTED"],
        case_id: caseId,
        evaluated_at: evaluatedAt,
      };
    }

    // Rule 3: Mule Activity detection
    if (this.isMuleActivity(input)) {
      const caseId = this.createCase(input.agent_id, "mule_activity");
      return {
        status: "ALRT",
        typology: "mule_activity",
        reason_codes: ["AML_MULE_ACTIVITY_DETECTED"],
        case_id: caseId,
        evaluated_at: evaluatedAt,
      };
    }

    // Rule 4: Rapid Movement detection
    if (this.isRapidMovement(input)) {
      const caseId = this.createCase(input.agent_id, "rapid_movement");
      return {
        status: "ALRT",
        typology: "rapid_movement",
        reason_codes: ["AML_RAPID_MOVEMENT_DETECTED"],
        case_id: caseId,
        evaluated_at: evaluatedAt,
      };
    }

    // No rules triggered — normal pass
    return {
      status: "NALT",
      reason_codes: ["AML_CHECK_PASS"],
      evaluated_at: evaluatedAt,
    };
  }

  /** Returns all cases in PENDING_REVIEW status. */
  getReviewQueue(): ReadonlyArray<AmlCase> {
    return Array.from(this.reviewQueue.values()).filter(
      (c) => c.status === "PENDING_REVIEW"
    );
  }

  /** Marks a case as REVIEWED. Throws if case_id not found. */
  resolveCase(caseId: string): void {
    const amlCase = this.reviewQueue.get(caseId);
    if (!amlCase) {
      throw new Error(`AML_CASE_NOT_FOUND: ${caseId}`);
    }
    // Mutate status — cases are mutable (unlike decision records)
    amlCase.status = "REVIEWED";
  }

  // -------------------------------------------------------------------------
  // Rule implementations
  // -------------------------------------------------------------------------

  /**
   * Structuring: 5+ transactions each < 10,000 SGD but total > 9,000 SGD.
   * Classic FATF structuring pattern — splitting a large amount into smaller
   * transactions just under the reporting threshold.
   */
  private isStructuring(input: AmlEvalInput): boolean {
    const history = input.transaction_history;
    if (!history) return false;

    const amounts = history.last_hour_amounts;
    if (amounts.length < STRUCTURING_MIN_TX_COUNT) return false;

    const allBelowThreshold = amounts.every(
      (a) => a < STRUCTURING_INDIVIDUAL_THRESHOLD
    );
    if (!allBelowThreshold) return false;

    const total = amounts.reduce((sum, a) => sum + a, 0);
    return total > STRUCTURING_TOTAL_THRESHOLD;
  }

  /**
   * Account Takeover: same agent_id, 3+ different counterparties in last hour.
   * Uses the engine's tracked counterparty map.
   */
  private isAccountTakeover(agentId: string): boolean {
    const counterparties = this.agentCounterparties.get(agentId);
    if (!counterparties) return false;
    return counterparties.size >= ACCOUNT_TAKEOVER_COUNTERPARTY_THRESHOLD;
  }

  /**
   * Mule Activity: amount > 50,000 SGD AND counterparty starts with 'unknown-'.
   */
  private isMuleActivity(input: AmlEvalInput): boolean {
    return (
      input.amount_sgd_cents > MULE_AMOUNT_THRESHOLD &&
      input.counterparty_id.startsWith(MULE_UNKNOWN_PREFIX)
    );
  }

  /**
   * Rapid Movement: more than 10 transactions in the last hour.
   */
  private isRapidMovement(input: AmlEvalInput): boolean {
    const history = input.transaction_history;
    if (!history) return false;
    return history.last_hour_count > RAPID_MOVEMENT_MAX_TX;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private trackCounterparty(agentId: string, counterpartyId: string): void {
    let counterparties = this.agentCounterparties.get(agentId);
    if (!counterparties) {
      counterparties = new Set<string>();
      this.agentCounterparties.set(agentId, counterparties);
    }
    counterparties.add(counterpartyId);
  }

  private createCase(agentId: string, typology: string): string {
    const caseId = `AML-${randomUUID().slice(0, 8).toUpperCase()}`;
    const amlCase: AmlCase = {
      case_id: caseId,
      agent_id: agentId,
      typology,
      status: "PENDING_REVIEW",
      created_at: new Date(),
    };
    this.reviewQueue.set(caseId, amlCase);
    return caseId;
  }

  private validateInput(input: AmlEvalInput): void {
    if (!input.agent_id.trim()) {
      throw new Error("AML_AGENT_ID_REQUIRED");
    }
    if (!input.counterparty_id.trim()) {
      throw new Error("AML_COUNTERPARTY_ID_REQUIRED");
    }
    if (
      !Number.isInteger(input.amount_sgd_cents) ||
      input.amount_sgd_cents < 0
    ) {
      throw new Error("AML_AMOUNT_INVALID");
    }
    if (
      !(input.timestamp instanceof Date) ||
      Number.isNaN(input.timestamp.getTime())
    ) {
      throw new Error("AML_TIMESTAMP_INVALID");
    }
  }

  /**
   * Validate ISO 20022 pain.001 fields when provided.
   * Missing required fields → throw validation error.
   */
  private validatePain001(input: AmlEvalInput): void {
    const pain = input.iso20022_pain001;
    if (!pain) return;

    if (!pain.originator_name?.trim()) {
      throw new Error("AML_PAIN001_ORIGINATOR_NAME_REQUIRED");
    }
    if (!pain.beneficiary_name?.trim()) {
      throw new Error("AML_PAIN001_BENEFICIARY_NAME_REQUIRED");
    }
    if (typeof pain.amount !== "number" || pain.amount <= 0) {
      throw new Error("AML_PAIN001_AMOUNT_INVALID");
    }
    if (!pain.currency?.trim()) {
      throw new Error("AML_PAIN001_CURRENCY_REQUIRED");
    }
  }
}
