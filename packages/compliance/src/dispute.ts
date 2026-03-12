import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DisputeCase {
  case_id: string;
  payment_id: string;
  agent_id: string;
  amount_sgd_cents: number;
  reason_code: string;
  status: "RECEIVED" | "EVIDENCE_GATHERING" | "SUBMITTED" | "RESOLVED";
  resolution?: "AUTO_REFUND" | "MANUAL_REFUND" | "REJECTED" | "SETTLED";
  created_at: Date;
  respond_by_at: Date; // SLA deadline: 5 business days from created_at
  resolved_at?: Date;
  evidence?: string[]; // list of evidence IDs (transaction records, decision records)
}

export type DisputeResolution =
  | "AUTO_REFUND"
  | "MANUAL_REFUND"
  | "REJECTED"
  | "SETTLED";

export interface CreateDisputeInput {
  payment_id: string;
  agent_id: string;
  amount_sgd_cents: number;
  reason_code: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Auto-accept threshold: disputes below 50 SGD (5,000 cents) are auto-refunded */
const AUTO_ACCEPT_THRESHOLD_CENTS = 5_000;

/** SLA deadline: 5 business days from dispute creation */
const SLA_BUSINESS_DAYS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Add N business days to a date (skips Saturday and Sunday).
 * Returns a new Date set to the Nth business day at the same time.
 */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// DisputeService
// ---------------------------------------------------------------------------

/**
 * Dispute / Case Management Service.
 *
 * Handles the lifecycle of payment disputes:
 *  1. Create → auto-accept if below threshold, else evidence gathering
 *  2. Add evidence → attach transaction/decision record IDs
 *  3. Submit → transition to SUBMITTED for review
 *  4. Resolve → final resolution (refund, reject, settle)
 *  5. SLA monitoring → detect breached deadlines
 *
 * TODO: Migrate from in-memory Map to PostgreSQL persistence.
 */
export class DisputeService {
  // TODO: Replace with PostgreSQL repository
  private readonly cases = new Map<string, DisputeCase>();

  /**
   * Create a new dispute case.
   *
   * If amount_sgd_cents < 5,000 (50 SGD), the dispute is auto-accepted:
   * status='RESOLVED', resolution='AUTO_REFUND', resolved_at=now.
   *
   * Otherwise: status='EVIDENCE_GATHERING', respond_by_at = now + 5 business days.
   */
  createDispute(input: CreateDisputeInput): DisputeCase {
    this.validateInput(input);

    const now = new Date();
    const caseId = `DSP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const respondByAt = addBusinessDays(now, SLA_BUSINESS_DAYS);

    const isAutoAccept = input.amount_sgd_cents < AUTO_ACCEPT_THRESHOLD_CENTS;

    const disputeCase: DisputeCase = {
      case_id: caseId,
      payment_id: input.payment_id,
      agent_id: input.agent_id,
      amount_sgd_cents: input.amount_sgd_cents,
      reason_code: input.reason_code,
      status: isAutoAccept ? "RESOLVED" : "EVIDENCE_GATHERING",
      resolution: isAutoAccept ? "AUTO_REFUND" : undefined,
      created_at: now,
      respond_by_at: respondByAt,
      resolved_at: isAutoAccept ? now : undefined,
      evidence: [],
    };

    this.cases.set(caseId, disputeCase);
    return disputeCase;
  }

  /** Retrieve a dispute case by ID. */
  getDispute(caseId: string): DisputeCase | undefined {
    return this.cases.get(caseId);
  }

  /** Retrieve all dispute cases for a given agent. */
  getDisputesByAgent(agentId: string): DisputeCase[] {
    return Array.from(this.cases.values()).filter(
      (c) => c.agent_id === agentId
    );
  }

  /**
   * Attach an evidence ID (transaction record, decision record) to a case.
   * Only allowed while status is RECEIVED or EVIDENCE_GATHERING.
   */
  addEvidence(caseId: string, evidenceId: string): DisputeCase {
    const disputeCase = this.requireCase(caseId);

    if (
      disputeCase.status !== "EVIDENCE_GATHERING" &&
      disputeCase.status !== "RECEIVED"
    ) {
      throw new Error(
        `DISPUTE_INVALID_STATE: Cannot add evidence in status ${disputeCase.status}`
      );
    }

    if (!evidenceId.trim()) {
      throw new Error("DISPUTE_EVIDENCE_ID_REQUIRED");
    }

    if (!disputeCase.evidence) {
      disputeCase.evidence = [];
    }
    disputeCase.evidence.push(evidenceId);
    return disputeCase;
  }

  /**
   * Submit the dispute for review.
   * Transitions: EVIDENCE_GATHERING → SUBMITTED.
   */
  submitDispute(caseId: string): DisputeCase {
    const disputeCase = this.requireCase(caseId);

    if (disputeCase.status !== "EVIDENCE_GATHERING") {
      throw new Error(
        `DISPUTE_INVALID_STATE: Cannot submit from status ${disputeCase.status}`
      );
    }

    disputeCase.status = "SUBMITTED";
    return disputeCase;
  }

  /**
   * Resolve a dispute with a final resolution.
   * Transitions: SUBMITTED → RESOLVED.
   */
  resolveDispute(caseId: string, resolution: DisputeResolution): DisputeCase {
    const disputeCase = this.requireCase(caseId);

    if (disputeCase.status !== "SUBMITTED") {
      throw new Error(
        `DISPUTE_INVALID_STATE: Cannot resolve from status ${disputeCase.status}`
      );
    }

    disputeCase.status = "RESOLVED";
    disputeCase.resolution = resolution;
    disputeCase.resolved_at = new Date();
    return disputeCase;
  }

  /**
   * Check for SLA breaches: cases where respond_by_at < now and status != RESOLVED.
   */
  checkSlaBreaches(): DisputeCase[] {
    const now = new Date();
    return Array.from(this.cases.values()).filter(
      (c) => c.status !== "RESOLVED" && c.respond_by_at < now
    );
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private requireCase(caseId: string): DisputeCase {
    const disputeCase = this.cases.get(caseId);
    if (!disputeCase) {
      throw new Error(`DISPUTE_CASE_NOT_FOUND: ${caseId}`);
    }
    return disputeCase;
  }

  private validateInput(input: CreateDisputeInput): void {
    if (!input.payment_id.trim()) {
      throw new Error("DISPUTE_PAYMENT_ID_REQUIRED");
    }
    if (!input.agent_id.trim()) {
      throw new Error("DISPUTE_AGENT_ID_REQUIRED");
    }
    if (
      !Number.isInteger(input.amount_sgd_cents) ||
      input.amount_sgd_cents < 0
    ) {
      throw new Error("DISPUTE_AMOUNT_INVALID");
    }
    if (!input.reason_code.trim()) {
      throw new Error("DISPUTE_REASON_CODE_REQUIRED");
    }
  }
}
