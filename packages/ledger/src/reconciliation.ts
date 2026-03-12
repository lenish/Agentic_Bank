export interface LedgerRecord {
  payment_id: string;
  amount_sgd_cents: number;
  settled_at: Date;
}

export interface ProviderRecord {
  reference_id: string;
  amount_sgd_cents: number;
  settled_at: Date;
}

export type ReconciliationBreakType =
  | "AMOUNT_MISMATCH"
  | "MISSING_IN_PROVIDER"
  | "MISSING_IN_LEDGER"
  | "TIMING_MISMATCH";

export interface ReconciliationBreak {
  payment_id: string;
  ledger_amount?: number;
  provider_amount?: number;
  break_type: ReconciliationBreakType;
  auto_matched: boolean;
}

export interface ReconciliationReport {
  run_at: Date;
  total_ledger_records: number;
  total_provider_records: number;
  matched: number;
  breaks: ReconciliationBreak[];
  manual_review_queue: ReconciliationBreak[];
}

const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

const toDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const cloneBreak = (
  reconciliationBreak: ReconciliationBreak,
): ReconciliationBreak => ({
  ...reconciliationBreak,
});

const cloneReport = (report: ReconciliationReport): ReconciliationReport => ({
  ...report,
  run_at: new Date(report.run_at),
  breaks: report.breaks.map((item) => cloneBreak(item)),
  manual_review_queue: report.manual_review_queue.map((item) => cloneBreak(item)),
});

export class ReconciliationEngine {
  private readonly reports: ReconciliationReport[] = [];
  private readonly manualReviewQueue: ReconciliationBreak[] = [];

  public reconcile(
    ledgerRecords: LedgerRecord[],
    providerRecords: ProviderRecord[],
  ): ReconciliationReport {
    const providerByReference = new Map<string, ProviderRecord>();
    for (const providerRecord of providerRecords) {
      providerByReference.set(providerRecord.reference_id, providerRecord);
    }

    const breaks: ReconciliationBreak[] = [];
    let matched = 0;

    for (const ledgerRecord of ledgerRecords) {
      const providerRecord = providerByReference.get(ledgerRecord.payment_id);

      if (!providerRecord) {
        breaks.push({
          payment_id: ledgerRecord.payment_id,
          ledger_amount: ledgerRecord.amount_sgd_cents,
          break_type: "MISSING_IN_PROVIDER",
          auto_matched: false,
        });
        continue;
      }

      providerByReference.delete(ledgerRecord.payment_id);

      if (ledgerRecord.amount_sgd_cents !== providerRecord.amount_sgd_cents) {
        breaks.push({
          payment_id: ledgerRecord.payment_id,
          ledger_amount: ledgerRecord.amount_sgd_cents,
          provider_amount: providerRecord.amount_sgd_cents,
          break_type: "AMOUNT_MISMATCH",
          auto_matched: false,
        });
        continue;
      }

      const settledDiffMs = Math.abs(
        ledgerRecord.settled_at.getTime() - providerRecord.settled_at.getTime(),
      );

      if (settledDiffMs === 0) {
        matched += 1;
        continue;
      }

      const autoMatched = settledDiffMs < DAY_WINDOW_MS;
      breaks.push({
        payment_id: ledgerRecord.payment_id,
        ledger_amount: ledgerRecord.amount_sgd_cents,
        provider_amount: providerRecord.amount_sgd_cents,
        break_type: "TIMING_MISMATCH",
        auto_matched: autoMatched,
      });

      if (autoMatched) {
        matched += 1;
      }
    }

    for (const providerRecord of providerByReference.values()) {
      breaks.push({
        payment_id: providerRecord.reference_id,
        provider_amount: providerRecord.amount_sgd_cents,
        break_type: "MISSING_IN_LEDGER",
        auto_matched: false,
      });
    }

    const manualReviewQueue = breaks
      .filter((item) => !item.auto_matched)
      .map((item) => cloneBreak(item));

    this.manualReviewQueue.push(...manualReviewQueue.map((item) => cloneBreak(item)));

    const report: ReconciliationReport = {
      run_at: new Date(),
      total_ledger_records: ledgerRecords.length,
      total_provider_records: providerRecords.length,
      matched,
      breaks: breaks.map((item) => cloneBreak(item)),
      manual_review_queue: manualReviewQueue,
    };

    this.reports.push(cloneReport(report));
    return cloneReport(report);
  }

  public generateDailyReport(date: Date): string {
    const dayKey = toDayKey(date);
    const dayReports = this.reports.filter(
      (report) => toDayKey(report.run_at) === dayKey,
    );

    const totals = dayReports.reduce(
      (accumulator, report) => {
        return {
          totalLedgerRecords:
            accumulator.totalLedgerRecords + report.total_ledger_records,
          totalProviderRecords:
            accumulator.totalProviderRecords + report.total_provider_records,
          matched: accumulator.matched + report.matched,
          breaks: accumulator.breaks + report.breaks.length,
          manual: accumulator.manual + report.manual_review_queue.length,
        };
      },
      {
        totalLedgerRecords: 0,
        totalProviderRecords: 0,
        matched: 0,
        breaks: 0,
        manual: 0,
      },
    );

    const lines: string[] = [
      `# Reconciliation Report (${dayKey})`,
      "",
      `- Runs: ${dayReports.length}`,
      `- Ledger records: ${totals.totalLedgerRecords}`,
      `- Provider records: ${totals.totalProviderRecords}`,
      `- Matched: ${totals.matched}`,
      `- Breaks: ${totals.breaks}`,
      `- Manual review queue items: ${totals.manual}`,
    ];

    if (totals.manual > 0) {
      lines.push("", "## Manual Review Items");
      for (const report of dayReports) {
        for (const item of report.manual_review_queue) {
          lines.push(
            `- ${item.payment_id} | ${item.break_type} | ledger=${item.ledger_amount ?? "n/a"} | provider=${item.provider_amount ?? "n/a"}`,
          );
        }
      }
    }

    return lines.join("\n");
  }

  public getManualReviewQueue(): ReconciliationBreak[] {
    return this.manualReviewQueue.map((item) => cloneBreak(item));
  }
}
