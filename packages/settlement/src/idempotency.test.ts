import { beforeEach, describe, expect, it } from "bun:test";

import { IdempotencyStore, type IdempotencyRecord } from "./idempotency";
import { OutboxService } from "./outbox";
import { SagaOrchestrator, type SagaStep } from "./saga";

interface PaymentRequest {
  amount_sgd_cents: number;
  counterparty: string;
}

interface PaymentResponse {
  payment_id: string;
  status: "SETTLED";
}

describe("IdempotencyStore", () => {
  let store: IdempotencyStore;

  beforeEach(() => {
    store = new IdempotencyStore();
  });

  it("stores and retrieves a record", () => {
    const record: IdempotencyRecord = {
      key: "idem-001",
      response: { payment_id: "pay-001", status: "SETTLED" },
      created_at: new Date(),
      status: "COMPLETE",
    };

    store.set(record.key, record);

    expect(store.has(record.key)).toBe(true);
    expect(store.get(record.key)).toEqual(record);
  });

  it("returns undefined for missing key", () => {
    expect(store.get("missing-key")).toBeUndefined();
  });

  it("throws when setting a duplicate key", () => {
    const now = new Date();

    store.set("idem-dup", {
      key: "idem-dup",
      response: { payment_id: "pay-001", status: "SETTLED" },
      created_at: now,
      status: "COMPLETE",
    });

    expect(() =>
      store.set("idem-dup", {
        key: "idem-dup",
        response: { payment_id: "pay-002", status: "SETTLED" },
        created_at: now,
        status: "COMPLETE",
      }),
    ).toThrow("IDEMPOTENCY_KEY_ALREADY_EXISTS");
  });

  it("throws when key does not match record key", () => {
    expect(() =>
      store.set("idem-outer", {
        key: "idem-inner",
        response: { ok: true },
        created_at: new Date(),
        status: "PENDING",
      }),
    ).toThrow("IDEMPOTENCY_KEY_MISMATCH");
  });

  it("reaps entries older than max age", async () => {
    store.set("old", {
      key: "old",
      response: { payment_id: "pay-old", status: "SETTLED" },
      created_at: new Date(),
      status: "PENDING",
    });

    await Bun.sleep(5);

    store.set("fresh", {
      key: "fresh",
      response: { payment_id: "pay-fresh", status: "SETTLED" },
      created_at: new Date(),
      status: "COMPLETE",
    });

    const removed = store.reap(2);

    expect(removed).toBe(1);
    expect(store.has("old")).toBe(false);
    expect(store.has("fresh")).toBe(true);
  });

  it("does not reap fresh entries", () => {
    store.set("fresh", {
      key: "fresh",
      response: { payment_id: "pay-fresh", status: "SETTLED" },
      created_at: new Date(),
      status: "COMPLETE",
    });

    const removed = store.reap(60_000);

    expect(removed).toBe(0);
    expect(store.has("fresh")).toBe(true);
  });

  it("throws for invalid reap max age", () => {
    expect(() => store.reap(-1)).toThrow("IDEMPOTENCY_REAP_MAX_AGE_INVALID");
    expect(() => store.reap(0.5)).toThrow("IDEMPOTENCY_REAP_MAX_AGE_INVALID");
  });

  it("returns cached response on same key and same body replay", () => {
    const paymentRequest: PaymentRequest = { amount_sgd_cents: 1_500_00, counterparty: "merchant-1" };
    const idempotencyKey = "payment-request-001";

    const first = executePaymentWithIdempotency(store, idempotencyKey, paymentRequest);
    const second = executePaymentWithIdempotency(store, idempotencyKey, paymentRequest);

    expect(first).toEqual(second);
    expect((store.get(idempotencyKey)?.response as PaymentResponse).payment_id).toBe(first.payment_id);
  });

  it("deduplicates duplicate webhook receipt by idempotency key", () => {
    const key = "webhook-event-001";
    const payload: PaymentRequest = { amount_sgd_cents: 950_00, counterparty: "merchant-2" };

    const first = executePaymentWithIdempotency(store, key, payload);
    const second = executePaymentWithIdempotency(store, key, payload);

    expect(second.payment_id).toBe(first.payment_id);
    expect(store.reap(60_000)).toBe(0);
  });

  it("reaps stuck pending keys after timeout", () => {
    const stale = new Date(Date.now() - 61_000);
    store.set("stuck-key", {
      key: "stuck-key",
      response: { state: "in-flight" },
      created_at: stale,
      status: "PENDING",
    });

    const removed = store.reap(60_000);

    expect(removed).toBe(1);
    expect(store.has("stuck-key")).toBe(false);
  });
});

describe("OutboxService", () => {
  it("keeps append-only events and marks processed on drain", () => {
    const outbox = new OutboxService();

    outbox.publish({
      id: "evt-1",
      event_type: "PAYMENT_CREATED",
      payload: { payment_id: "pay-1" },
      created_at: new Date(),
      processed: false,
    });
    outbox.publish({
      id: "evt-2",
      event_type: "PAYMENT_SETTLED",
      payload: { payment_id: "pay-1" },
      created_at: new Date(),
      processed: false,
    });

    const drained = outbox.drain();

    expect(drained.length).toBe(2);
    expect(drained[0]?.processed).toBe(true);
    expect(drained[1]?.processed).toBe(true);
    expect(outbox.getUnprocessed().length).toBe(0);
  });
});

describe("SagaOrchestrator", () => {
  it("executes all steps in order and returns completed", async () => {
    const outbox = new OutboxService();
    const orchestrator = new SagaOrchestrator(outbox);
    const order: string[] = [];

    const steps: SagaStep[] = [
      {
        name: "debit",
        execute: async () => {
          order.push("debit:execute");
          return { ok: true };
        },
        compensate: async () => {
          order.push("debit:compensate");
        },
      },
      {
        name: "credit",
        execute: async () => {
          order.push("credit:execute");
          return { ok: true };
        },
        compensate: async () => {
          order.push("credit:compensate");
        },
      },
    ];

    const result = await orchestrator.execute("saga-success", steps);

    expect(result.status).toBe("COMPLETED");
    expect(result.completed_steps).toEqual(["debit", "credit"]);
    expect(order).toEqual(["debit:execute", "credit:execute"]);
    expect(outbox.getUnprocessed().length).toBe(4);
  });

  it("compensates completed steps in reverse order on failure", async () => {
    const outbox = new OutboxService();
    const orchestrator = new SagaOrchestrator(outbox);
    const order: string[] = [];

    const steps: SagaStep[] = [
      {
        name: "reserve-funds",
        execute: async () => {
          order.push("reserve-funds:execute");
          return { reserved: true };
        },
        compensate: async () => {
          order.push("reserve-funds:compensate");
        },
      },
      {
        name: "post-ledger",
        execute: async () => {
          order.push("post-ledger:execute");
          throw new Error("LEDGER_POST_FAILED");
        },
        compensate: async () => {
          order.push("post-ledger:compensate");
        },
      },
    ];

    const result = await orchestrator.execute("saga-failure", steps);

    expect(result.status).toBe("COMPENSATED");
    expect(result.failed_step).toBe("post-ledger");
    expect(result.completed_steps).toEqual(["reserve-funds"]);
    expect(result.compensation_errors).toEqual([]);
    expect(order).toEqual([
      "reserve-funds:execute",
      "post-ledger:execute",
      "reserve-funds:compensate",
    ]);
  });

  it("returns failed when compensation itself errors", async () => {
    const outbox = new OutboxService();
    const orchestrator = new SagaOrchestrator(outbox);

    const steps: SagaStep[] = [
      {
        name: "step-a",
        execute: async () => "ok",
        compensate: async () => {
          throw new Error("COMPENSATION_FAILED");
        },
      },
      {
        name: "step-b",
        execute: async () => {
          throw new Error("STEP_B_FAILED");
        },
        compensate: async () => undefined,
      },
    ];

    const result = await orchestrator.execute("saga-compensation-failed", steps);

    expect(result.status).toBe("FAILED");
    expect(result.failed_step).toBe("step-b");
    expect(result.compensation_errors).toEqual(["step-a:COMPENSATION_FAILED"]);
  });
});

const executePaymentWithIdempotency = (
  store: IdempotencyStore,
  key: string,
  body: PaymentRequest,
): PaymentResponse => {
  const existing = store.get(key);
  if (existing?.status === "COMPLETE") {
    return existing.response as PaymentResponse;
  }

  const payment: PaymentResponse = {
    payment_id: `pay-${body.amount_sgd_cents}-${body.counterparty}`,
    status: "SETTLED",
  };

  store.set(key, {
    key,
    response: payment,
    created_at: new Date(),
    status: "COMPLETE",
  });

  return payment;
};
