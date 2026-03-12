import { createGateway } from "./gateway";
import { PaymentPipeline, type PaymentPipelineServices } from "./pipeline";

interface CapabilityRecord {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}

interface Percentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface LoadScenarioResult {
  name: string;
  totalRequests: number;
  concurrency: number;
  successCount: number;
  errorCount: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface LoadScenarioOptions {
  name: string;
  totalRequests: number;
  concurrency: number;
  requestFactory: (index: number) => {
    path: string;
    init?: RequestInit;
    expectedStatus?: number;
  };
  appRequest: (
    path: string,
    init?: RequestInit,
  ) => Response | Promise<Response>;
}

export const defaultCapabilityLookup = {
  getById(id: string): CapabilityRecord | undefined {
    if (id === "active-cap") {
      return { id: "active-cap", status: "ACTIVE" };
    }

    return undefined;
  },
};

class InMemoryIdempotencyStore {
  private readonly data = new Map<
    string,
    { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" }
  >();

  public has(key: string): boolean {
    return this.data.has(key);
  }

  public get(key: string):
    | { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" }
    | undefined {
    return this.data.get(key);
  }

  public set(
    key: string,
    record: { key: string; response: unknown; created_at: Date; status: "PENDING" | "COMPLETE" },
  ): void {
    this.data.set(key, record);
  }
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.max(0, Math.ceil(sortedValues.length * ratio) - 1);
  return sortedValues[index] ?? 0;
}

function summarize(latencies: readonly number[]): Percentiles & {
  min: number;
  max: number;
  avg: number;
} {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const total = latencies.reduce((sum, value) => sum + value, 0);

  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    avg: total / latencies.length,
  };
}

export async function runLoadScenario(options: LoadScenarioOptions): Promise<LoadScenarioResult> {
  let cursor = 0;
  let successCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];

  await Promise.all(
    Array.from({ length: options.concurrency }, async () => {
      for (;;) {
        const requestIndex = cursor;
        cursor += 1;

        if (requestIndex >= options.totalRequests) {
          return;
        }

        const input = options.requestFactory(requestIndex);
        const startedAt = performance.now();
        const response = await options.appRequest(input.path, input.init);
        const elapsedMs = performance.now() - startedAt;
        latencies.push(elapsedMs);

        const expectedStatus = input.expectedStatus;
        const isSuccess =
          expectedStatus === undefined
            ? response.ok
            : response.status === expectedStatus;
        if (isSuccess) {
          successCount += 1;
        } else {
          errorCount += 1;
        }
      }
    }),
  );

  const stats = summarize(latencies);
  return {
    name: options.name,
    totalRequests: options.totalRequests,
    concurrency: options.concurrency,
    successCount,
    errorCount,
    minMs: stats.min,
    maxMs: stats.max,
    avgMs: stats.avg,
    p50Ms: stats.p50,
    p95Ms: stats.p95,
    p99Ms: stats.p99,
  };
}

export function createInMemoryPipeline(): PaymentPipeline {
  const idempotencyStore = new InMemoryIdempotencyStore();

  const services: PaymentPipelineServices = {
    kya: {
      verify: () => ({ sub: "agent-1" }),
    },
    capability: {
      verify: () => undefined,
    },
    policy: {
      evaluate: () => ({
        allowed: true,
        policy_version: "1.0.0",
        reason_codes: [],
      }),
    },
    risk: {
      evaluate: () => ({
        risk_score: 12,
        decision: "ALLOW",
        reason_codes: ["LOW_RISK"],
      }),
    },
    settlement: {
      stateMachine: {
        initiate: () => undefined,
        transition: () => undefined,
      },
      rail: {
        submit: async () => ({ reference_id: crypto.randomUUID(), status: "PENDING" }),
        confirm: async (referenceId: string) => ({ reference_id: referenceId, status: "SETTLED" }),
      },
      idempotencyStore,
    },
    ledger: {
      createEntry: async () => ({ ok: true }),
    },
    compliance: {
      append: async () => ({ id: crypto.randomUUID() }),
    },
  };

  return new PaymentPipeline(services);
}

export async function runDefaultLoadSuite(): Promise<{
  health: LoadScenarioResult;
  payments: LoadScenarioResult;
}> {
  const app = createGateway({
    capabilityLookup: defaultCapabilityLookup,
    paymentPipeline: createInMemoryPipeline(),
    rateLimitOptions: { maxRequests: 10_000, windowMs: 60_000 },
  });

  const health = await runLoadScenario({
    name: "GET /health",
    totalRequests: 1_000,
    concurrency: 100,
    appRequest: (path, init) => app.request(path, init),
    requestFactory: () => ({ path: "/health", expectedStatus: 200 }),
  });

  const payments = await runLoadScenario({
    name: "POST /api/v1/payments",
    totalRequests: 1_000,
    concurrency: 100,
    appRequest: (path, init) => app.request(path, init),
    requestFactory: (index) => ({
      path: "/api/v1/payments",
      expectedStatus: 201,
      init: {
        method: "POST",
        headers: {
          Authorization: "Bearer svid-token",
          "X-Capability-Id": "active-cap",
          "Content-Type": "application/json",
          "X-Idempotency-Key": `idem-${index}`,
        },
        body: JSON.stringify({
          payment_id: `payment-${index}`,
          agent_id: "agent-1",
          amount: 10_000,
          to: "merchant-1",
          action: "PAYMENT_TRANSFER",
        }),
      },
    }),
  });

  return { health, payments };
}

if (import.meta.main) {
  const results = await runDefaultLoadSuite();
  const lines = [
    "# API Gateway Load Test",
    `health p50=${results.health.p50Ms.toFixed(2)}ms p95=${results.health.p95Ms.toFixed(2)}ms p99=${results.health.p99Ms.toFixed(2)}ms errors=${results.health.errorCount}`,
    `payments p50=${results.payments.p50Ms.toFixed(2)}ms p95=${results.payments.p95Ms.toFixed(2)}ms p99=${results.payments.p99Ms.toFixed(2)}ms errors=${results.payments.errorCount}`,
  ];
  console.log(lines.join("\n"));
}
