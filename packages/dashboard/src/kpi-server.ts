import { Hono } from 'hono';
import { KpiAggregator, type KpiEvent, type KpiEventType } from './kpi';

const EVENT_TYPES: ReadonlySet<KpiEventType> = new Set([
  'SETTLEMENT_SUCCESS',
  'SETTLEMENT_FAILURE',
  'FRAUD_DETECTED',
  'FALSE_DECLINE',
  'DISPUTE_WON',
  'DISPUTE_LOST',
  'AML_ALERT',
  'RECONCILIATION_BREAK',
]);

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function parseEvent(raw: unknown): KpiEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const payload = raw as Record<string, unknown>;
  const type = payload.type;
  const timestamp = payload.timestamp;

  if (typeof type !== 'string' || !EVENT_TYPES.has(type as KpiEventType)) {
    return null;
  }

  if (typeof timestamp !== 'string') {
    return null;
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null;
  }

  const amount = payload.amount_sgd_cents;
  const normalizedAmount = typeof amount === 'number' ? amount : undefined;

  return {
    type: type as KpiEventType,
    amount_sgd_cents: normalizedAmount,
    timestamp: parsedTimestamp,
  };
}

export function createKpiServer(aggregator: KpiAggregator = new KpiAggregator()) {
  const app = new Hono();

  app.get('/api/v1/kpi/snapshot', (c) => {
    const from = parseDate(c.req.query('from'));
    const to = parseDate(c.req.query('to'));
    return c.json(aggregator.getSnapshot(from, to));
  });

  app.get('/api/v1/kpi/timeseries', (c) => {
    const intervalValue = c.req.query('interval') ?? '5';
    const interval = Number.parseInt(intervalValue, 10);
    if (Number.isNaN(interval) || interval <= 0) {
      return c.json({ error: 'interval must be a positive integer' }, 400);
    }

    return c.json(aggregator.getTimeSeries(interval));
  });

  app.post('/api/v1/kpi/events', async (c) => {
    const body = await c.req.json().catch(() => null);
    const event = parseEvent(body);

    if (!event) {
      return c.json({ error: 'invalid KPI event payload' }, 400);
    }

    aggregator.record(event);
    return c.json({ status: 'ok' }, 201);
  });

  return app;
}
