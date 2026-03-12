import { describe, it, expect, beforeEach } from "bun:test";
import { createGateway } from "./gateway";
import { maskPiiFields } from "./middleware/pii-mask";
import type { CapabilityLookup } from "./middleware/capability";
import type { Hono } from "hono";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLookup: CapabilityLookup = {
  getById(id: string) {
    if (id === "active-cap") return { id: "active-cap", status: "ACTIVE" };
    if (id === "expired-cap") return { id: "expired-cap", status: "EXPIRED" };
    if (id === "revoked-cap") return { id: "revoked-cap", status: "REVOKED" };
    return undefined;
  },
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: "Bearer test-svid-token", ...extra };
}

function capHeaders(
  capId = "active-cap",
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    ...authHeaders(),
    "X-Capability-Id": capId,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("API Gateway", () => {
  let app: Hono;

  beforeEach(() => {
    app = createGateway({ capabilityLookup: mockLookup });
  });

  // 1 ── Health check ──────────────────────────────────────────────────
  it("GET /health → 200 { status: ok }", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ status: "ok" });
  });

  // 2 ── Unauthenticated → 401 ────────────────────────────────────────
  it("GET /api/v1/agents without auth → 401 UNAUTHORIZED", async () => {
    const res = await app.request("/api/v1/agents");
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: "UNAUTHORIZED" });
  });

  // 3 ── Authenticated (auth-only route) → 200 ────────────────────────
  it("GET /api/v1/agents with Bearer token → 200", async () => {
    const res = await app.request("/api/v1/agents", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("agents");
  });

  // 4 ── Auth + no capability → 403 ───────────────────────────────────
  it("GET /api/v1/accounts/:id/balance with auth but no capability → 403", async () => {
    const res = await app.request("/api/v1/accounts/acct-1/balance", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: "CAPABILITY_REQUIRED" });
  });

  // 5 ── Expired capability → 403 ─────────────────────────────────────
  it("GET /api/v1/accounts/:id/balance with expired capability → 403", async () => {
    const res = await app.request("/api/v1/accounts/acct-1/balance", {
      headers: capHeaders("expired-cap"),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      error: "CAPABILITY_INVALID",
      reason: "CAPABILITY_EXPIRED",
    });
  });

  // 6 ── Valid auth + capability → 200 ────────────────────────────────
  it("GET /api/v1/accounts/:id/balance with valid auth + capability → 200", async () => {
    const res = await app.request("/api/v1/accounts/acct-1/balance", {
      headers: capHeaders("active-cap"),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("account_id", "acct-1");
    expect(body).toHaveProperty("balance_sgd_cents", 0);
  });

  // 7 ── Invalid request body → 400 ───────────────────────────────────
  it("POST /api/v1/payments with invalid body → 400 VALIDATION_ERROR", async () => {
    const res = await app.request("/api/v1/payments", {
      method: "POST",
      headers: {
        ...capHeaders("active-cap"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: -5 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "VALIDATION_ERROR");
    expect(body).toHaveProperty("details");
  });

  // 8 ── Valid payment → 201 ──────────────────────────────────────────
  it("POST /api/v1/payments with valid auth + capability + body → 201", async () => {
    const res = await app.request("/api/v1/payments", {
      method: "POST",
      headers: {
        ...capHeaders("active-cap"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 1000, to: "recipient-1" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("payment_id");
    expect(body).toHaveProperty("status", "initiated");
  });

  // 9 ── Rate limit exceeded → 429 ────────────────────────────────────
  it("exceeding rate limit → 429 RATE_LIMIT_EXCEEDED", async () => {
    // Create gateway with very low limit for testing
    const limited = createGateway({
      capabilityLookup: mockLookup,
      rateLimitOptions: { maxRequests: 3, windowMs: 60_000 },
    });

    // First 3 should succeed
    for (let i = 0; i < 3; i++) {
      const res = await limited.request("/health");
      expect(res.status).toBe(200);
    }

    // 4th should be rate-limited
    const res = await limited.request("/health");
    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: "RATE_LIMIT_EXCEEDED" });
  });

  // 10 ── PII masking utility ─────────────────────────────────────────
  it("maskPiiFields masks sensitive fields without modifying nested structure", () => {
    const input = {
      name: "Alice",
      email: "alice@example.com",
      phone: "+65-9123-4567",
      account_number: "1234567890",
      iban: "SG12BANK0001234567",
      national_id: "S1234567A",
      address: {
        city: "Singapore",
        phone: "+65-9999-0000",
      },
      transactions: [
        { id: "tx-1", email: "bob@example.com" },
      ],
    };

    const masked = maskPiiFields(input) as Record<string, unknown>;

    // Top-level PII masked
    expect(masked.email).toBe("***MASKED***");
    expect(masked.phone).toBe("***MASKED***");
    expect(masked.account_number).toBe("***MASKED***");
    expect(masked.iban).toBe("***MASKED***");
    expect(masked.national_id).toBe("***MASKED***");

    // Non-PII preserved
    expect(masked.name).toBe("Alice");

    // Nested PII masked
    const addr = masked.address as Record<string, unknown>;
    expect(addr.city).toBe("Singapore");
    expect(addr.phone).toBe("***MASKED***");

    // Array items masked
    const txs = masked.transactions as Array<Record<string, unknown>>;
    expect(txs[0].id).toBe("tx-1");
    expect(txs[0].email).toBe("***MASKED***");

    // Original not mutated
    expect(input.email).toBe("alice@example.com");
  });
});
