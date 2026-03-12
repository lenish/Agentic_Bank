import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import {
  capabilityMiddleware,
  type CapabilityLookup,
} from "./middleware/capability";
import {
  rateLimitMiddleware,
  type RateLimitOptions,
} from "./middleware/rate-limit";
import { piiMaskMiddleware } from "./middleware/pii-mask";
import { validateMiddleware, type ValidationSchema } from "./middleware/validate";

// ---------------------------------------------------------------------------
// Gateway configuration
// ---------------------------------------------------------------------------

export interface GatewayOptions {
  /** Capability lookup (inject CapabilityTokenService or a mock). */
  readonly capabilityLookup: CapabilityLookup;
  /** Optional rate-limit overrides. */
  readonly rateLimitOptions?: RateLimitOptions;
}

// ---------------------------------------------------------------------------
// Inline payment validation schema (avoids adding zod as a direct dep)
// ---------------------------------------------------------------------------

interface PaymentIssue {
  readonly path: ReadonlyArray<string>;
  readonly message: string;
}

const paymentSchema: ValidationSchema = {
  safeParse(data: unknown) {
    if (typeof data !== "object" || data === null) {
      return {
        success: false as const,
        error: {
          issues: [{ path: [] as string[], message: "Expected object" }],
        },
      };
    }

    const obj = data as Record<string, unknown>;
    const issues: PaymentIssue[] = [];

    if (typeof obj.amount !== "number" || obj.amount <= 0) {
      issues.push({
        path: ["amount"],
        message: "Amount must be a positive number",
      });
    }
    if (typeof obj.to !== "string" || !obj.to) {
      issues.push({ path: ["to"], message: "Recipient (to) is required" });
    }

    if (issues.length > 0) {
      return { success: false as const, error: { issues } };
    }
    return { success: true as const, data };
  },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGateway(options: GatewayOptions): Hono {
  const app = new Hono();

  // ── Global middleware ───────────────────────────────────────────────
  app.use("*", rateLimitMiddleware(options.rateLimitOptions));
  app.use("*", piiMaskMiddleware());

  // ── Health check (public) ───────────────────────────────────────────
  app.get("/health", (c) => c.json({ status: "ok" }));

  // ── Auth middleware for all /api/* routes ────────────────────────────
  app.use("/api/*", authMiddleware());

  // ── Auth-only routes ────────────────────────────────────────────────
  app.get("/api/v1/agents", (c) => c.json({ agents: [] }));

  app.post("/api/v1/agents", (c) =>
    c.json({ id: crypto.randomUUID(), status: "created" }, 201),
  );

  app.get("/api/v1/decisions", (c) => c.json({ decisions: [] }));

  // ── Auth + capability routes ────────────────────────────────────────
  const cap = capabilityMiddleware(options.capabilityLookup);

  app.get("/api/v1/accounts/:id/balance", cap, (c) => {
    const id = c.req.param("id");
    return c.json({
      account_id: id,
      balance_sgd_cents: 0,
      currency: "SGD",
    });
  });

  app.post(
    "/api/v1/payments",
    cap,
    validateMiddleware(paymentSchema),
    (c) =>
      c.json(
        { payment_id: crypto.randomUUID(), status: "initiated" },
        201,
      ),
  );

  return app;
}
