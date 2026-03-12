import { describe, it, expect, beforeEach } from "bun:test";
import {
  PricingEngine,
  FREE_TIER_LIMIT,
  TRANSACTION_COST_CENTS,
  PREMIUM_DECISION_COST_CENTS,
  createBillingRoutes,
} from "./pricing";
import type { FreeTierResult, Invoice, UsageSummary } from "./pricing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recordTransactions(engine: PricingEngine, accountId: string, count: number): void {
  for (let i = 0; i < count; i++) {
    engine.recordUsage(accountId, "transaction");
  }
}

// ---------------------------------------------------------------------------
// PricingEngine unit tests
// ---------------------------------------------------------------------------

describe("PricingEngine", () => {
  let engine: PricingEngine;

  beforeEach(() => {
    engine = new PricingEngine();
  });

  // 1 ── Free tier allows up to 100 transactions ────────────────────
  it("free tier allows exactly 100 transactions", () => {
    recordTransactions(engine, "acc-1", 99);

    const check = engine.checkFreeTier("acc-1") as FreeTierResult;
    expect(check.allowed).toBe(true);
    expect(check.remaining).toBe(1);
    expect(check.exceeded).toBe(false);

    engine.recordUsage("acc-1", "transaction");

    const checkAfter = engine.checkFreeTier("acc-1") as FreeTierResult;
    expect(checkAfter.allowed).toBe(false);
    expect(checkAfter.remaining).toBe(0);
    expect(checkAfter.exceeded).toBe(true);
  });

  // 2 ── Free tier exceeded at 101 returns upgrade URL ──────────────
  it("free tier exceeded at 101 returns upgrade_url", () => {
    recordTransactions(engine, "acc-2", 101);

    const check = engine.checkFreeTier("acc-2") as FreeTierResult;
    expect(check.allowed).toBe(false);
    expect(check.exceeded).toBe(true);
    expect(check.remaining).toBe(0);
    expect(check.upgrade_url).toBe("https://aoa.example.com/upgrade");
  });

  // 3 ── Usage tracking records correct types ────────────────────────
  it("records and tracks usage by type", () => {
    engine.recordUsage("acc-3", "transaction");
    engine.recordUsage("acc-3", "decision");
    engine.recordUsage("acc-3", "api_call");
    engine.recordUsage("acc-3", "transaction");

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const summary = engine.getUsageSummary("acc-3", month) as UsageSummary;

    expect(summary.transaction_count).toBe(2);
    expect(summary.decision_count).toBe(1);
    expect(summary.api_call_count).toBe(1);
    expect(summary.tier).toBe("FREE");
  });

  // 4 ── Invoice generation for free tier ────────────────────────────
  it("generates invoice with free tier + overage line items", () => {
    recordTransactions(engine, "acc-4", 105);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const invoice = engine.generateInvoice("acc-4", month) as Invoice;

    expect(invoice.account_id).toBe("acc-4");
    expect(invoice.currency).toBe("SGD");
    expect(invoice.line_items.length).toBe(2);

    // Free tier line
    const freeLine = invoice.line_items[0];
    expect(freeLine.description).toBe("Free Tier Transactions");
    expect(freeLine.quantity).toBe(FREE_TIER_LIMIT);
    expect(freeLine.total_sgd_cents).toBe(0);

    // Overage line
    const overageLine = invoice.line_items[1];
    expect(overageLine.description).toBe("Overage Transactions");
    expect(overageLine.quantity).toBe(5);
    expect(overageLine.total_sgd_cents).toBe(5 * TRANSACTION_COST_CENTS);

    expect(invoice.subtotal_sgd_cents).toBe(5 * TRANSACTION_COST_CENTS);
  });

  // 5 ── Pro tier charges per-use ────────────────────────────────────
  it("pro tier charges per transaction and decision", () => {
    engine.setTier("acc-5", "PRO");

    engine.recordUsage("acc-5", "transaction");
    engine.recordUsage("acc-5", "decision");

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const invoice = engine.generateInvoice("acc-5", month) as Invoice;

    const txLine = invoice.line_items.find((l) => l.description === "Pro Transactions");
    const decLine = invoice.line_items.find((l) => l.description === "Premium Risk Decisions");

    expect(txLine).toBeDefined();
    expect(txLine!.total_sgd_cents).toBe(TRANSACTION_COST_CENTS);
    expect(decLine).toBeDefined();
    expect(decLine!.total_sgd_cents).toBe(PREMIUM_DECISION_COST_CENTS);
  });

  // 6 ── Pro tier has no free tier limit ─────────────────────────────
  it("pro tier checkFreeTier always returns allowed", () => {
    engine.setTier("acc-6", "PRO");
    recordTransactions(engine, "acc-6", 500);

    const check = engine.checkFreeTier("acc-6") as FreeTierResult;
    expect(check.allowed).toBe(true);
    expect(check.exceeded).toBe(false);
  });

  // 7 ── Default tier is FREE ────────────────────────────────────────
  it("defaults to FREE tier for unknown accounts", () => {
    expect(engine.getTier("unknown-acc")).toBe("FREE");
  });

  // 8 ── Invoice for zero usage ──────────────────────────────────────
  it("generates empty invoice for zero usage", () => {
    const invoice = engine.generateInvoice("acc-8", "2026-01") as Invoice;

    expect(invoice.line_items.length).toBe(0);
    expect(invoice.subtotal_sgd_cents).toBe(0);
    expect(invoice.invoice_id).toBe("INV-acc-8-2026-01");
  });

  // 9 ── Usage summary reflects free tier remaining ──────────────────
  it("usage summary shows correct free_tier_remaining", () => {
    recordTransactions(engine, "acc-9", 40);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const summary = engine.getUsageSummary("acc-9", month) as UsageSummary;

    expect(summary.free_tier_remaining).toBe(60);
    expect(summary.transaction_count).toBe(40);
    expect(summary.total_cost_sgd_cents).toBe(0);
  });

  // 10 ── Free tier transactions cost zero, overage costs 1 cent ─────
  it("free tier transactions cost 0, overage costs 1 cent each", () => {
    recordTransactions(engine, "acc-10", FREE_TIER_LIMIT);

    // 101st transaction should be charged
    const overageRecord = engine.recordUsage("acc-10", "transaction");
    expect(overageRecord.costSgdCents).toBe(TRANSACTION_COST_CENTS);
  });
});

// ---------------------------------------------------------------------------
// Billing API route tests
// ---------------------------------------------------------------------------

describe("Billing API routes", () => {
  let engine: PricingEngine;

  beforeEach(() => {
    engine = new PricingEngine();
  });

  // 11 ── GET /api/v1/billing/usage returns usage summary ────────────
  it("GET /api/v1/billing/usage returns usage summary", async () => {
    engine.recordUsage("acc-api-1", "transaction");
    const app = createBillingRoutes(engine);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const res = await app.request(
      `/api/v1/billing/usage?account_id=acc-api-1&month=${month}`,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.account_id).toBe("acc-api-1");
    expect(body.transaction_count).toBe(1);
    expect(body.tier).toBe("FREE");
  });

  // 12 ── GET /api/v1/billing/invoice returns invoice ────────────────
  it("GET /api/v1/billing/invoice returns invoice", async () => {
    recordTransactions(engine, "acc-api-2", 5);
    const app = createBillingRoutes(engine);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const res = await app.request(
      `/api/v1/billing/invoice?account_id=acc-api-2&month=${month}`,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.account_id).toBe("acc-api-2");
    expect(body.currency).toBe("SGD");
    expect(typeof body.generated_at).toBe("string");
  });

  // 13 ── Missing account_id returns 400 ─────────────────────────────
  it("returns 400 when account_id is missing", async () => {
    const app = createBillingRoutes(engine);

    const usageRes = await app.request("/api/v1/billing/usage");
    expect(usageRes.status).toBe(400);

    const invoiceRes = await app.request("/api/v1/billing/invoice");
    expect(invoiceRes.status).toBe(400);
  });
});
