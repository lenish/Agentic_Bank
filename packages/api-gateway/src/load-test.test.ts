import { describe, expect, it } from "bun:test";
import { createGateway } from "./gateway";
import { PaymentPipeline, type PaymentPipelineServices } from "./pipeline";
import { createInMemoryPipeline, defaultCapabilityLookup, runLoadScenario } from "./load-test";

const AUTH_HEADERS = {
  Authorization: "Bearer svid-token",
  "X-Capability-Id": "active-cap",
  "Content-Type": "application/json",
};

describe("API gateway load and degradation", () => {
  it("keeps GET /health p95 under 200ms at 100 concurrent / 1000 requests", async () => {
    const app = createGateway({
      capabilityLookup: defaultCapabilityLookup,
      rateLimitOptions: { maxRequests: 10_000, windowMs: 60_000 },
    });

    const result = await runLoadScenario({
      name: "health",
      totalRequests: 1_000,
      concurrency: 100,
      appRequest: (path, init) => app.request(path, init),
      requestFactory: () => ({
        path: "/health",
        expectedStatus: 200,
      }),
    });

    expect(result.errorCount).toBe(0);
    expect(result.p95Ms).toBeLessThan(200);
    expect(result.p99Ms).toBeLessThan(400);
  });

  it("keeps POST /api/v1/payments p95 under 500ms at 100 concurrent / 1000 requests", async () => {
    const app = createGateway({
      capabilityLookup: defaultCapabilityLookup,
      paymentPipeline: createInMemoryPipeline(),
      rateLimitOptions: { maxRequests: 10_000, windowMs: 60_000 },
    });

    const result = await runLoadScenario({
      name: "payments",
      totalRequests: 1_000,
      concurrency: 100,
      appRequest: (path, init) => app.request(path, init),
      requestFactory: (index) => ({
        path: "/api/v1/payments",
        expectedStatus: 201,
        init: {
          method: "POST",
          headers: {
            ...AUTH_HEADERS,
            "X-Idempotency-Key": `idem-load-${index}`,
          },
          body: JSON.stringify({
            payment_id: `pay-load-${index}`,
            agent_id: "agent-1",
            amount: 2_500,
            to: "merchant-1",
            action: "PAYMENT_TRANSFER",
          }),
        },
      }),
    });

    expect(result.errorCount).toBe(0);
    expect(result.p95Ms).toBeLessThan(500);
    expect(result.p99Ms).toBeLessThan(800);
  });

  it("gracefully degrades with 503 + Retry-After when downstream is unavailable", async () => {
    const unavailableServices: PaymentPipelineServices = {
      kya: { verify: () => ({ sub: "agent-1" }) },
      capability: { verify: () => undefined },
      policy: {
        evaluate: () => ({ allowed: true, policy_version: "1.0.0", reason_codes: [] }),
      },
      risk: {
        evaluate: () => ({ risk_score: 0, decision: "ALLOW", reason_codes: [] }),
      },
      settlement: {
        stateMachine: { initiate: () => undefined, transition: () => undefined },
        rail: {
          submit: async () => ({ reference_id: "x", status: "PENDING" }),
          confirm: async () => ({ reference_id: "x", status: "SETTLED" }),
        },
        idempotencyStore: {
          has: () => {
            throw new Error("DOWNSTREAM_UNAVAILABLE");
          },
          get: () => undefined,
          set: () => undefined,
        },
      },
      ledger: { createEntry: async () => ({ ok: true }) },
      compliance: { append: async () => ({ id: "decision-1" }) },
    };

    const app = createGateway({
      capabilityLookup: defaultCapabilityLookup,
      paymentPipeline: new PaymentPipeline(unavailableServices),
    });

    const response = await app.request("/api/v1/payments", {
      method: "POST",
      headers: {
        ...AUTH_HEADERS,
        "X-Idempotency-Key": "idem-downstream",
      },
      body: JSON.stringify({
        payment_id: "pay-downstream",
        agent_id: "agent-1",
        amount: 1_000,
        to: "merchant-1",
        action: "PAYMENT_TRANSFER",
      }),
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "SERVICE_UNAVAILABLE");
  });
});
