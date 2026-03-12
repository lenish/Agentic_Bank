// ---------------------------------------------------------------------------
// Pilot Customer Onboarding — SC Ventures network simulation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnboardingStatus = "PENDING" | "ACTIVE" | "COMPLETED";

export interface PilotCustomer {
  readonly id: string;
  readonly name: string;
  readonly tier: "FREE";
  readonly region: "SG";
}

export interface AgentSubAccount {
  readonly accountId: string;
  readonly agentId: string;
  readonly customerId: string;
  readonly purpose: string;
  readonly createdAt: Date;
  readonly active: boolean;
}

export interface MasterAccount {
  readonly accountId: string;
  readonly customerId: string;
  readonly createdAt: Date;
  readonly active: boolean;
}

export interface OnboardingResult {
  readonly customerId: string;
  readonly customerName: string;
  readonly status: OnboardingStatus;
  readonly masterAccount: MasterAccount;
  readonly agentAccounts: ReadonlyArray<AgentSubAccount>;
  readonly onboardedAt: Date;
}

export interface TransactionRecord {
  readonly transactionId: string;
  readonly customerId: string;
  readonly agentId: string;
  readonly amountSgdCents: number;
  readonly timestamp: Date;
  readonly status: "COMPLETED";
}

export interface FeedbackRecord {
  readonly customerId: string;
  readonly nps: number;
  readonly comment: string;
  readonly collectedAt: Date;
}

export interface PilotReport {
  readonly generatedAt: Date;
  readonly customersOnboarded: number;
  readonly customersActive: number;
  readonly customersCompleted: number;
  readonly totalTransactions: number;
  readonly totalVolumeSgdCents: number;
  readonly averageNps: number | null;
  readonly feedbackCount: number;
  readonly customers: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly status: OnboardingStatus;
    readonly transactionCount: number;
    readonly volumeSgdCents: number;
    readonly nps: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Pilot customer definitions (SC Ventures network)
// ---------------------------------------------------------------------------

export const PILOT_CUSTOMERS: ReadonlyArray<PilotCustomer> = [
  { id: "pilot-001", name: "TechCorp Singapore", tier: "FREE", region: "SG" },
  { id: "pilot-002", name: "FinanceHub Asia", tier: "FREE", region: "SG" },
  { id: "pilot-003", name: "TradeFlow Pte Ltd", tier: "FREE", region: "SG" },
];

// ---------------------------------------------------------------------------
// PilotOnboardingService
// ---------------------------------------------------------------------------

export class PilotOnboardingService {
  /** Customer onboarding results: customerId -> OnboardingResult */
  private readonly onboardingResults: Map<string, OnboardingResult> = new Map();

  /** Transaction records: customerId -> TransactionRecord[] */
  private readonly transactions: Map<string, TransactionRecord[]> = new Map();

  /** Feedback records: customerId -> FeedbackRecord */
  private readonly feedback: Map<string, FeedbackRecord> = new Map();

  /** Customer status overrides: customerId -> OnboardingStatus */
  private readonly statusOverrides: Map<string, OnboardingStatus> = new Map();

  // ── Onboarding ─────────────────────────────────────────────────────

  /**
   * Onboard a pilot customer: creates master account + 2 agent sub-accounts,
   * sets status to ACTIVE.
   */
  public onboardCustomer(customerId: string): OnboardingResult {
    const existing = this.onboardingResults.get(customerId);
    if (existing) {
      return existing;
    }

    const customer = PILOT_CUSTOMERS.find((c) => c.id === customerId);
    if (!customer) {
      throw new Error(`Unknown pilot customer: ${customerId}`);
    }

    const now = new Date();

    const masterAccount: MasterAccount = {
      accountId: `master-${customerId}`,
      customerId,
      createdAt: now,
      active: true,
    };

    const agentAccounts: AgentSubAccount[] = [
      {
        accountId: `agent-${customerId}-001`,
        agentId: `agent-${customerId}-001`,
        customerId,
        purpose: "payment-processing",
        createdAt: now,
        active: true,
      },
      {
        accountId: `agent-${customerId}-002`,
        agentId: `agent-${customerId}-002`,
        customerId,
        purpose: "reconciliation",
        createdAt: now,
        active: true,
      },
    ];

    const result: OnboardingResult = {
      customerId,
      customerName: customer.name,
      status: "ACTIVE",
      masterAccount,
      agentAccounts,
      onboardedAt: now,
    };

    this.onboardingResults.set(customerId, result);
    this.statusOverrides.set(customerId, "ACTIVE");
    this.transactions.set(customerId, []);

    return result;
  }

  // ── Transactions ───────────────────────────────────────────────────

  /**
   * Record a completed transaction for a pilot customer's agent.
   * Amount must be a positive integer (SGD cents).
   */
  public recordTransaction(
    customerId: string,
    agentId: string,
    amountCents: number,
  ): TransactionRecord {
    const onboarding = this.onboardingResults.get(customerId);
    if (!onboarding) {
      throw new Error(`Customer ${customerId} not onboarded`);
    }

    const agentExists = onboarding.agentAccounts.some(
      (a) => a.agentId === agentId,
    );
    if (!agentExists) {
      throw new Error(`Agent ${agentId} not found for customer ${customerId}`);
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("Amount must be a positive integer (SGD cents)");
    }

    const records = this.transactions.get(customerId) ?? [];

    const record: TransactionRecord = {
      transactionId: `txn-${customerId}-${String(records.length + 1).padStart(3, "0")}`,
      customerId,
      agentId,
      amountSgdCents: amountCents,
      timestamp: new Date(),
      status: "COMPLETED",
    };

    records.push(record);
    this.transactions.set(customerId, records);

    return record;
  }

  // ── Status ─────────────────────────────────────────────────────────

  /**
   * Get onboarding status for a customer.
   * PENDING if not yet onboarded, ACTIVE once onboarded, COMPLETED if
   * at least 1 transaction exists and feedback collected.
   */
  public getOnboardingStatus(customerId: string): OnboardingStatus {
    const override = this.statusOverrides.get(customerId);
    if (!override) {
      return "PENDING";
    }

    // Auto-complete if has transactions + feedback
    const txns = this.transactions.get(customerId) ?? [];
    const hasFeedback = this.feedback.has(customerId);
    if (txns.length > 0 && hasFeedback) {
      this.statusOverrides.set(customerId, "COMPLETED");
      return "COMPLETED";
    }

    return override;
  }

  // ── Feedback ───────────────────────────────────────────────────────

  /**
   * Collect NPS feedback from a pilot customer.
   * NPS must be 0-10 integer.
   */
  public collectFeedback(
    customerId: string,
    nps: number,
    comment: string,
  ): FeedbackRecord {
    if (!this.onboardingResults.has(customerId)) {
      throw new Error(`Customer ${customerId} not onboarded`);
    }

    if (!Number.isInteger(nps) || nps < 0 || nps > 10) {
      throw new Error("NPS must be an integer between 0 and 10");
    }

    const record: FeedbackRecord = {
      customerId,
      nps,
      comment,
      collectedAt: new Date(),
    };

    this.feedback.set(customerId, record);

    return record;
  }

  // ── Reporting ──────────────────────────────────────────────────────

  /**
   * Generate a summary pilot report across all onboarded customers.
   */
  public generatePilotReport(): PilotReport {
    const allOnboarded = Array.from(this.onboardingResults.values());

    let totalTransactions = 0;
    let totalVolumeSgdCents = 0;
    let npsSum = 0;
    let npsCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    const customers = allOnboarded.map((ob) => {
      const txns = this.transactions.get(ob.customerId) ?? [];
      const volume = txns.reduce((sum, t) => sum + t.amountSgdCents, 0);
      const fb = this.feedback.get(ob.customerId);
      const status = this.getOnboardingStatus(ob.customerId);

      totalTransactions += txns.length;
      totalVolumeSgdCents += volume;

      if (fb) {
        npsSum += fb.nps;
        npsCount += 1;
      }

      if (status === "ACTIVE") activeCount += 1;
      if (status === "COMPLETED") completedCount += 1;

      return {
        id: ob.customerId,
        name: ob.customerName,
        status,
        transactionCount: txns.length,
        volumeSgdCents: volume,
        nps: fb ? fb.nps : null,
      };
    });

    return {
      generatedAt: new Date(),
      customersOnboarded: allOnboarded.length,
      customersActive: activeCount,
      customersCompleted: completedCount,
      totalTransactions,
      totalVolumeSgdCents,
      averageNps: npsCount > 0 ? Math.round((npsSum / npsCount) * 10) / 10 : null,
      feedbackCount: npsCount,
      customers,
    };
  }
}
