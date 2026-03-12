import { beforeEach, describe, expect, it } from 'bun:test';
import { KpiAggregator } from './kpi';
import { createKpiServer } from './kpi-server';

describe('KpiAggregator', () => {
  let aggregator: KpiAggregator;

  beforeEach(() => {
    aggregator = new KpiAggregator();
  });

  it('returns zeroed snapshot when no events exist', () => {
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.fraud_loss_bps).toBe(0);
    expect(snapshot.false_decline_rate).toBe(0);
    expect(snapshot.settlement_success_rate).toBe(0);
    expect(snapshot.reconciliation_break_rate).toBe(0);
    expect(snapshot.dispute_win_rate).toBe(0);
    expect(snapshot.aml_alert_rate).toBe(0);
  });

  it('computes settlement success and AML/reconciliation rates', () => {
    const now = new Date('2026-03-12T10:00:00.000Z');
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 20_000, timestamp: now });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 5_000, timestamp: now });
    aggregator.record({ type: 'AML_ALERT', timestamp: now });
    aggregator.record({ type: 'RECONCILIATION_BREAK', timestamp: now });

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.settlement_success_rate).toBeCloseTo(66.6667, 3);
    expect(snapshot.aml_alert_rate).toBeCloseTo(33.3333, 3);
    expect(snapshot.reconciliation_break_rate).toBeCloseTo(33.3333, 3);
  });

  it('computes fraud loss in basis points', () => {
    const now = new Date('2026-03-12T10:00:00.000Z');
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 90_000, timestamp: now });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'FRAUD_DETECTED', amount_sgd_cents: 500, timestamp: now });

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.fraud_loss_bps).toBeCloseTo(50, 5);
  });

  it('computes false decline and dispute win rates', () => {
    const now = new Date('2026-03-12T10:00:00.000Z');
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'FALSE_DECLINE', timestamp: now });
    aggregator.record({ type: 'DISPUTE_WON', timestamp: now });
    aggregator.record({ type: 'DISPUTE_LOST', timestamp: now });
    aggregator.record({ type: 'DISPUTE_WON', timestamp: now });

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.false_decline_rate).toBe(50);
    expect(snapshot.dispute_win_rate).toBeCloseTo(66.6667, 3);
  });

  it('filters snapshot by from/to range', () => {
    const t1 = new Date('2026-03-12T10:00:00.000Z');
    const t2 = new Date('2026-03-12T10:05:00.000Z');
    const t3 = new Date('2026-03-12T10:10:00.000Z');

    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: t1 });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 10_000, timestamp: t2 });
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: t3 });

    const snapshot = aggregator.getSnapshot(new Date('2026-03-12T10:04:00.000Z'), new Date('2026-03-12T10:06:00.000Z'));
    expect(snapshot.settlement_success_rate).toBe(0);
  });

  it('returns one snapshot per interval in time series', () => {
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: new Date('2026-03-12T10:00:00.000Z') });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 10_000, timestamp: new Date('2026-03-12T10:04:00.000Z') });
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: new Date('2026-03-12T10:07:00.000Z') });

    const series = aggregator.getTimeSeries(5);
    expect(series).toHaveLength(2);
    expect(series[0]?.settlement_success_rate).toBe(50);
    expect(series[1]?.settlement_success_rate).toBe(100);
  });

  it('detects threshold breaches via checkAlerts', () => {
    const now = new Date('2026-03-12T10:00:00.000Z');
    aggregator.record({ type: 'SETTLEMENT_SUCCESS', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'SETTLEMENT_FAILURE', amount_sgd_cents: 10_000, timestamp: now });
    aggregator.record({ type: 'AML_ALERT', timestamp: now });

    const alerts = aggregator.checkAlerts({ aml_alert_rate: 10 });
    expect(alerts.triggered).toBe(true);
    expect(alerts.breached_kpis).toEqual(['aml_alert_rate']);
  });
});

describe('KPI server', () => {
  it('records event through API and returns snapshot', async () => {
    const app = createKpiServer();

    const postRes = await app.request('/api/v1/kpi/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SETTLEMENT_SUCCESS',
        amount_sgd_cents: 20_000,
        timestamp: '2026-03-12T10:00:00.000Z',
      }),
    });

    expect(postRes.status).toBe(201);

    const snapshotRes = await app.request('/api/v1/kpi/snapshot');
    expect(snapshotRes.status).toBe(200);
    const snapshot = (await snapshotRes.json()) as { settlement_success_rate: number };
    expect(snapshot.settlement_success_rate).toBe(100);
  });

  it('returns 400 for invalid interval and invalid event payload', async () => {
    const app = createKpiServer();

    const intervalRes = await app.request('/api/v1/kpi/timeseries?interval=0');
    expect(intervalRes.status).toBe(400);

    const invalidEventRes = await app.request('/api/v1/kpi/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'INVALID', timestamp: 'not-a-date' }),
    });
    expect(invalidEventRes.status).toBe(400);
  });
});
