export type KpiEventType =
  | 'SETTLEMENT_SUCCESS'
  | 'SETTLEMENT_FAILURE'
  | 'FRAUD_DETECTED'
  | 'FALSE_DECLINE'
  | 'DISPUTE_WON'
  | 'DISPUTE_LOST'
  | 'AML_ALERT'
  | 'RECONCILIATION_BREAK';

export interface KpiEvent {
  type: KpiEventType;
  amount_sgd_cents?: number;
  timestamp: Date;
}

export interface KpiSnapshot {
  timestamp: Date;
  fraud_loss_bps: number;
  false_decline_rate: number;
  settlement_success_rate: number;
  reconciliation_break_rate: number;
  dispute_win_rate: number;
  aml_alert_rate: number;
}

type KpiCounts = {
  settlement_success: number;
  settlement_failure: number;
  false_decline: number;
  dispute_won: number;
  dispute_lost: number;
  aml_alert: number;
  reconciliation_break: number;
  fraud_loss_cents: number;
  settlement_volume_cents: number;
};

const ZERO_COUNTS: KpiCounts = {
  settlement_success: 0,
  settlement_failure: 0,
  false_decline: 0,
  dispute_won: 0,
  dispute_lost: 0,
  aml_alert: 0,
  reconciliation_break: 0,
  fraud_loss_cents: 0,
  settlement_volume_cents: 0,
};

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function bps(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 10_000;
}

function isWithinRange(date: Date, from?: Date, to?: Date): boolean {
  const timestamp = date.getTime();
  if (from && timestamp < from.getTime()) return false;
  if (to && timestamp > to.getTime()) return false;
  return true;
}

export class KpiAggregator {
  private readonly events: KpiEvent[] = [];

  record(event: KpiEvent): void {
    this.events.push({
      ...event,
      timestamp: new Date(event.timestamp),
    });
  }

  getSnapshot(from?: Date, to?: Date): KpiSnapshot {
    const counts = this.calculateCounts(from, to);
    const settlement_total = counts.settlement_success + counts.settlement_failure;
    const dispute_total = counts.dispute_won + counts.dispute_lost;

    return {
      timestamp: to ? new Date(to) : new Date(),
      fraud_loss_bps: bps(counts.fraud_loss_cents, counts.settlement_volume_cents),
      false_decline_rate: percentage(counts.false_decline, settlement_total),
      settlement_success_rate: percentage(counts.settlement_success, settlement_total),
      reconciliation_break_rate: percentage(counts.reconciliation_break, settlement_total),
      dispute_win_rate: percentage(counts.dispute_won, dispute_total),
      aml_alert_rate: percentage(counts.aml_alert, settlement_total),
    };
  }

  getTimeSeries(intervalMinutes: number): KpiSnapshot[] {
    if (intervalMinutes <= 0) return [];
    if (this.events.length === 0) return [];

    const interval_ms = intervalMinutes * 60_000;
    const sorted = [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const start_ms = sorted[0].timestamp.getTime();
    const end_ms = sorted[sorted.length - 1].timestamp.getTime();

    const snapshots: KpiSnapshot[] = [];
    let cursor = start_ms;

    while (cursor <= end_ms) {
      const from = new Date(cursor);
      const to = new Date(cursor + interval_ms - 1);
      const snapshot = this.getSnapshot(from, to);
      snapshots.push({ ...snapshot, timestamp: to });
      cursor += interval_ms;
    }

    return snapshots;
  }

  checkAlerts(thresholds: Partial<KpiSnapshot>): { triggered: boolean; breached_kpis: string[] } {
    const snapshot = this.getSnapshot();
    const breached_kpis: string[] = [];
    const keys = Object.keys(thresholds) as Array<keyof KpiSnapshot>;

    for (const key of keys) {
      if (key === 'timestamp') continue;
      const threshold = thresholds[key];
      if (typeof threshold === 'number' && snapshot[key] > threshold) {
        breached_kpis.push(key);
      }
    }

    return {
      triggered: breached_kpis.length > 0,
      breached_kpis,
    };
  }

  private calculateCounts(from?: Date, to?: Date): KpiCounts {
    const counts: KpiCounts = { ...ZERO_COUNTS };

    for (const event of this.events) {
      if (!isWithinRange(event.timestamp, from, to)) {
        continue;
      }

      const amount = event.amount_sgd_cents ?? 0;

      switch (event.type) {
        case 'SETTLEMENT_SUCCESS':
          counts.settlement_success += 1;
          counts.settlement_volume_cents += amount;
          break;
        case 'SETTLEMENT_FAILURE':
          counts.settlement_failure += 1;
          counts.settlement_volume_cents += amount;
          break;
        case 'FRAUD_DETECTED':
          counts.fraud_loss_cents += amount;
          break;
        case 'FALSE_DECLINE':
          counts.false_decline += 1;
          break;
        case 'DISPUTE_WON':
          counts.dispute_won += 1;
          break;
        case 'DISPUTE_LOST':
          counts.dispute_lost += 1;
          break;
        case 'AML_ALERT':
          counts.aml_alert += 1;
          break;
        case 'RECONCILIATION_BREAK':
          counts.reconciliation_break += 1;
          break;
        default:
          break;
      }
    }

    return counts;
  }
}
