import { beforeEach, describe, expect, test } from "bun:test";

import {
  type LedgerRecord,
  type ProviderRecord,
  ReconciliationEngine,
} from "./reconciliation";

const baseDate = new Date("2026-03-12T00:00:00.000Z");

const makeLedgerRecord = (
  paymentId: string,
  amountSgdCents: number,
  settledAt: Date,
): LedgerRecord => ({
  payment_id: paymentId,
  amount_sgd_cents: amountSgdCents,
  settled_at: settledAt,
});

const makeProviderRecord = (
  referenceId: string,
  amountSgdCents: number,
  settledAt: Date,
): ProviderRecord => ({
  reference_id: referenceId,
  amount_sgd_cents: amountSgdCents,
  settled_at: settledAt,
});

describe("ReconciliationEngine", () => {
  let engine: ReconciliationEngine;

  beforeEach(() => {
    engine = new ReconciliationEngine();
  });

  test("100 normal transactions reconcile with zero breaks", () => {
    const ledgerRecords: LedgerRecord[] = [];
    const providerRecords: ProviderRecord[] = [];

    for (let index = 0; index < 100; index += 1) {
      const paymentId = `payment-${index}`;
      const amount = 1_000 + index;
      const settledAt = new Date(baseDate.getTime() + index * 60_000);
      ledgerRecords.push(makeLedgerRecord(paymentId, amount, settledAt));
      providerRecords.push(makeProviderRecord(paymentId, amount, settledAt));
    }

    const report = engine.reconcile(ledgerRecords, providerRecords);

    expect(report.total_ledger_records).toBe(100);
    expect(report.total_provider_records).toBe(100);
    expect(report.matched).toBe(100);
    expect(report.breaks).toHaveLength(0);
    expect(report.manual_review_queue).toHaveLength(0);
  });

  test("timing mismatch under 24h auto-matches", () => {
    const ledgerRecord = makeLedgerRecord("pay-1", 50_000, baseDate);
    const providerRecord = makeProviderRecord(
      "pay-1",
      50_000,
      new Date(baseDate.getTime() + 2 * 60 * 60 * 1000),
    );

    const report = engine.reconcile([ledgerRecord], [providerRecord]);

    expect(report.matched).toBe(1);
    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].break_type).toBe("TIMING_MISMATCH");
    expect(report.breaks[0].auto_matched).toBe(true);
    expect(report.manual_review_queue).toHaveLength(0);
    expect(engine.getManualReviewQueue()).toHaveLength(0);
  });

  test("timing mismatch at or over 24h stays in manual queue", () => {
    const ledgerRecord = makeLedgerRecord("pay-2", 50_000, baseDate);
    const providerRecord = makeProviderRecord(
      "pay-2",
      50_000,
      new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
    );

    const report = engine.reconcile([ledgerRecord], [providerRecord]);

    expect(report.matched).toBe(0);
    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].break_type).toBe("TIMING_MISMATCH");
    expect(report.breaks[0].auto_matched).toBe(false);
    expect(report.manual_review_queue).toHaveLength(1);
  });

  test("amount mismatch creates manual-review break", () => {
    const ledgerRecord = makeLedgerRecord("pay-3", 50_000, baseDate);
    const providerRecord = makeProviderRecord("pay-3", 45_000, baseDate);

    const report = engine.reconcile([ledgerRecord], [providerRecord]);

    expect(report.matched).toBe(0);
    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0]).toEqual({
      payment_id: "pay-3",
      ledger_amount: 50_000,
      provider_amount: 45_000,
      break_type: "AMOUNT_MISMATCH",
      auto_matched: false,
    });
    expect(report.manual_review_queue).toHaveLength(1);
    expect(engine.getManualReviewQueue()).toHaveLength(1);
  });

  test("missing provider record is reported", () => {
    const report = engine.reconcile(
      [makeLedgerRecord("pay-4", 15_000, baseDate)],
      [],
    );

    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].break_type).toBe("MISSING_IN_PROVIDER");
    expect(report.breaks[0].payment_id).toBe("pay-4");
    expect(report.manual_review_queue).toHaveLength(1);
  });

  test("missing ledger record is reported", () => {
    const report = engine.reconcile(
      [],
      [makeProviderRecord("pay-5", 22_000, baseDate)],
    );

    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].break_type).toBe("MISSING_IN_LEDGER");
    expect(report.breaks[0].payment_id).toBe("pay-5");
    expect(report.manual_review_queue).toHaveLength(1);
  });

  test("getManualReviewQueue returns all non-auto-matched breaks", () => {
    engine.reconcile(
      [makeLedgerRecord("pay-6", 10_000, baseDate)],
      [makeProviderRecord("pay-6", 9_000, baseDate)],
    );
    engine.reconcile(
      [makeLedgerRecord("pay-7", 20_000, baseDate)],
      [
        makeProviderRecord(
          "pay-7",
          20_000,
          new Date(baseDate.getTime() + 60 * 60 * 1000),
        ),
      ],
    );
    engine.reconcile(
      [makeLedgerRecord("pay-8", 30_000, baseDate)],
      [],
    );

    const queue = engine.getManualReviewQueue();

    expect(queue).toHaveLength(2);
    expect(queue.map((item) => item.payment_id)).toEqual(["pay-6", "pay-8"]);
  });

  test("generateDailyReport returns markdown summary with manual items", () => {
    engine.reconcile(
      [makeLedgerRecord("pay-9", 11_000, baseDate)],
      [makeProviderRecord("pay-9", 11_000, baseDate)],
    );
    engine.reconcile(
      [makeLedgerRecord("pay-10", 12_000, baseDate)],
      [makeProviderRecord("pay-10", 10_000, baseDate)],
    );

    const markdown = engine.generateDailyReport(new Date());

    expect(markdown).toContain("# Reconciliation Report (");
    expect(markdown).toContain("- Runs: 2");
    expect(markdown).toContain("- Matched: 1");
    expect(markdown).toContain("- Manual review queue items: 1");
    expect(markdown).toContain("pay-10 | AMOUNT_MISMATCH");
  });

  test("QA scenario: ledger 500 SGD vs provider 450 SGD creates break", () => {
    const report = engine.reconcile(
      [makeLedgerRecord("qa-payment", 50_000, baseDate)],
      [makeProviderRecord("qa-payment", 45_000, baseDate)],
    );

    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].break_type).toBe("AMOUNT_MISMATCH");
    expect(report.manual_review_queue).toHaveLength(1);
    expect(engine.getManualReviewQueue()).toHaveLength(1);
  });
});
