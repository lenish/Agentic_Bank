// ---------------------------------------------------------------------------
// Commercial Pricing Engine — Free tier + token-based billing
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageType = "transaction" | "decision" | "api_call";

export interface UsageRecord {
  readonly accountId: string;
  readonly type: UsageType;
  readonly timestamp: Date;
  /** Cost in SGD cents (integer). 0 for free-tier usage. */
  readonly costSgdCents: number;
}

export interface FreeTierResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly exceeded: boolean;
  readonly upgrade_url?: string;
}

export interface InvoiceLineItem {
  readonly description: string;
  readonly quantity: number;
  readonly unit_price_sgd_cents: number;
  readonly total_sgd_cents: number;
}

export interface Invoice {
  readonly invoice_id: string;
  readonly account_id: string;
  readonly month: string;
  readonly line_items: ReadonlyArray<InvoiceLineItem>;
  readonly subtotal_sgd_cents: number;
  readonly currency: "SGD";
  readonly generated_at: Date;
}

export interface UsageSummary {
  readonly account_id: string;
  readonly month: string;
  readonly transaction_count: number;
  readonly decision_count: number;
  readonly api_call_count: number;
  readonly total_cost_sgd_cents: number;
  readonly tier: "FREE" | "PRO";
  readonly free_tier_remaining: number;
}

export type PricingTier = "FREE" | "PRO";

export interface AccountTier {
  readonly accountId: string;
  readonly tier: PricingTier;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Free tier monthly transaction limit */
export const FREE_TIER_LIMIT = 100;

/** Cost per additional transaction in SGD cents (0.01 SGD = 1 cent) */
export const TRANSACTION_COST_CENTS = 1;

/** Cost per premium risk model decision in SGD cents (0.05 SGD = 5 cents) */
export const PREMIUM_DECISION_COST_CENTS = 5;

/** Cost per API call beyond free tier in SGD cents */
export const API_CALL_COST_CENTS = 1;

const UPGRADE_URL = "https://aoa.example.com/upgrade";

// ---------------------------------------------------------------------------
// PricingEngine
// ---------------------------------------------------------------------------

export class PricingEngine {
  /** Per-account usage records: accountId → records[] */
  private readonly usage: Map<string, UsageRecord[]> = new Map();

  /** Per-account tier: accountId → tier */
  private readonly tiers: Map<string, PricingTier> = new Map();

  // ── Tier management ────────────────────────────────────────────────

  public setTier(accountId: string, tier: PricingTier): void {
    this.tiers.set(accountId, tier);
  }

  public getTier(accountId: string): PricingTier {
    return this.tiers.get(accountId) ?? "FREE";
  }

  // ── Usage tracking ─────────────────────────────────────────────────

  public recordUsage(accountId: string, type: UsageType): UsageRecord {
    const tier = this.getTier(accountId);
    const monthlyTxCount = this.getMonthlyCount(accountId, "transaction");

    let costSgdCents = 0;

    if (tier === "PRO") {
      // Pro users pay per-use for everything
      costSgdCents = this.getCostForType(type);
    } else {
      // Free tier: transactions free up to limit, then charged
      if (type === "transaction") {
        if (monthlyTxCount >= FREE_TIER_LIMIT) {
          costSgdCents = TRANSACTION_COST_CENTS;
        }
      } else if (type === "decision") {
        // Decisions only available to Pro tier — free tier gets basic only
        costSgdCents = 0;
      } else {
        // API calls free for free tier within transaction limit
        costSgdCents = 0;
      }
    }

    const record: UsageRecord = {
      accountId,
      type,
      timestamp: new Date(),
      costSgdCents,
    };

    const records = this.usage.get(accountId) ?? [];
    records.push(record);
    this.usage.set(accountId, records);

    return record;
  }

  // ── Free tier check ────────────────────────────────────────────────

  public checkFreeTier(accountId: string): FreeTierResult {
    const tier = this.getTier(accountId);

    if (tier === "PRO") {
      return { allowed: true, remaining: Infinity, exceeded: false };
    }

    const monthlyTxCount = this.getMonthlyCount(accountId, "transaction");
    const remaining = Math.max(0, FREE_TIER_LIMIT - monthlyTxCount);
    const exceeded = monthlyTxCount >= FREE_TIER_LIMIT;

    if (exceeded) {
      return {
        allowed: false,
        remaining: 0,
        exceeded: true,
        upgrade_url: UPGRADE_URL,
      };
    }

    return { allowed: true, remaining, exceeded: false };
  }

  // ── Invoice generation ─────────────────────────────────────────────

  public generateInvoice(accountId: string, month: string): Invoice {
    const records = this.getMonthlyRecords(accountId, month);
    const tier = this.getTier(accountId);

    const txRecords = records.filter((r) => r.type === "transaction");
    const decisionRecords = records.filter((r) => r.type === "decision");
    const apiCallRecords = records.filter((r) => r.type === "api_call");

    const lineItems: InvoiceLineItem[] = [];

    if (tier === "FREE") {
      // Free tier line item
      const freeTxCount = Math.min(txRecords.length, FREE_TIER_LIMIT);
      if (freeTxCount > 0) {
        lineItems.push({
          description: "Free Tier Transactions",
          quantity: freeTxCount,
          unit_price_sgd_cents: 0,
          total_sgd_cents: 0,
        });
      }

      // Overage transactions
      const overageCount = Math.max(0, txRecords.length - FREE_TIER_LIMIT);
      if (overageCount > 0) {
        lineItems.push({
          description: "Overage Transactions",
          quantity: overageCount,
          unit_price_sgd_cents: TRANSACTION_COST_CENTS,
          total_sgd_cents: overageCount * TRANSACTION_COST_CENTS,
        });
      }
    } else {
      // Pro tier line items
      if (txRecords.length > 0) {
        lineItems.push({
          description: "Pro Transactions",
          quantity: txRecords.length,
          unit_price_sgd_cents: TRANSACTION_COST_CENTS,
          total_sgd_cents: txRecords.length * TRANSACTION_COST_CENTS,
        });
      }

      if (decisionRecords.length > 0) {
        lineItems.push({
          description: "Premium Risk Decisions",
          quantity: decisionRecords.length,
          unit_price_sgd_cents: PREMIUM_DECISION_COST_CENTS,
          total_sgd_cents: decisionRecords.length * PREMIUM_DECISION_COST_CENTS,
        });
      }

      if (apiCallRecords.length > 0) {
        lineItems.push({
          description: "API Calls",
          quantity: apiCallRecords.length,
          unit_price_sgd_cents: API_CALL_COST_CENTS,
          total_sgd_cents: apiCallRecords.length * API_CALL_COST_CENTS,
        });
      }
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.total_sgd_cents, 0);

    return {
      invoice_id: `INV-${accountId}-${month}`,
      account_id: accountId,
      month,
      line_items: lineItems,
      subtotal_sgd_cents: subtotal,
      currency: "SGD",
      generated_at: new Date(),
    };
  }

  // ── Usage summary ──────────────────────────────────────────────────

  public getUsageSummary(accountId: string, month: string): UsageSummary {
    const records = this.getMonthlyRecords(accountId, month);
    const tier = this.getTier(accountId);

    const txCount = records.filter((r) => r.type === "transaction").length;
    const decisionCount = records.filter((r) => r.type === "decision").length;
    const apiCallCount = records.filter((r) => r.type === "api_call").length;
    const totalCost = records.reduce((sum, r) => sum + r.costSgdCents, 0);
    const freeRemaining =
      tier === "FREE" ? Math.max(0, FREE_TIER_LIMIT - txCount) : Infinity;

    return {
      account_id: accountId,
      month,
      transaction_count: txCount,
      decision_count: decisionCount,
      api_call_count: apiCallCount,
      total_cost_sgd_cents: totalCost,
      tier,
      free_tier_remaining: freeRemaining,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private getCostForType(type: UsageType): number {
    switch (type) {
      case "transaction":
        return TRANSACTION_COST_CENTS;
      case "decision":
        return PREMIUM_DECISION_COST_CENTS;
      case "api_call":
        return API_CALL_COST_CENTS;
    }
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  private getMonthlyCount(accountId: string, type: UsageType): number {
    const currentMonth = this.getCurrentMonth();
    return this.getMonthlyRecords(accountId, currentMonth).filter(
      (r) => r.type === type,
    ).length;
  }

  private getMonthlyRecords(accountId: string, month: string): UsageRecord[] {
    const records = this.usage.get(accountId) ?? [];
    return records.filter((r) => {
      const recordYear = r.timestamp.getFullYear();
      const recordMonth = String(r.timestamp.getMonth() + 1).padStart(2, "0");
      return `${recordYear}-${recordMonth}` === month;
    });
  }
}

// ---------------------------------------------------------------------------
// Billing API routes (Hono)
// ---------------------------------------------------------------------------

import { Hono } from "hono";

export function createBillingRoutes(engine: PricingEngine): Hono {
  const app = new Hono();

  // GET /api/v1/billing/usage?account_id=...&month=YYYY-MM
  app.get("/api/v1/billing/usage", (c) => {
    const accountId = c.req.query("account_id");
    if (!accountId) {
      return c.json({ error: "account_id query parameter required" }, 400);
    }

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = c.req.query("month") ?? defaultMonth;

    const summary = engine.getUsageSummary(accountId, month);
    return c.json(summary);
  });

  // GET /api/v1/billing/invoice?account_id=...&month=YYYY-MM
  app.get("/api/v1/billing/invoice", (c) => {
    const accountId = c.req.query("account_id");
    if (!accountId) {
      return c.json({ error: "account_id query parameter required" }, 400);
    }

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = c.req.query("month") ?? defaultMonth;

    const invoice = engine.generateInvoice(accountId, month);
    return c.json({
      ...invoice,
      generated_at: invoice.generated_at.toISOString(),
    });
  });

  return app;
}
