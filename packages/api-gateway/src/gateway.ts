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
import { PaymentPipeline } from "./pipeline";

// ---------------------------------------------------------------------------
// Gateway configuration
// ---------------------------------------------------------------------------

export interface GatewayOptions {
  /** Capability lookup (inject CapabilityTokenService or a mock). */
  readonly capabilityLookup: CapabilityLookup;
  /** Optional rate-limit overrides. */
  readonly rateLimitOptions?: RateLimitOptions;
  readonly paymentPipeline?: PaymentPipeline;
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
    async (c) => {
      if (!options.paymentPipeline) {
        return c.json(
          { payment_id: crypto.randomUUID(), status: "initiated" },
          201,
        );
      }

      const body = (await c.req.json()) as Record<string, unknown>;
      const authorization = c.req.header("Authorization") ?? "";
      const bearerToken = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";
      const paymentId =
        typeof body.payment_id === "string" && body.payment_id.trim()
          ? body.payment_id
          : crypto.randomUUID();
      const amount = typeof body.amount === "number" ? Math.trunc(body.amount) : 0;
      const counterpartyId = typeof body.to === "string" ? body.to : "";
      const capabilityId = c.req.header("X-Capability-Id") ?? "";
      const idempotencyKey = c.req.header("X-Idempotency-Key") ?? paymentId;

      const result = await options.paymentPipeline.execute(
        {
          payment_id: paymentId,
          agent_id:
            typeof body.agent_id === "string" && body.agent_id.trim()
              ? body.agent_id
              : "agent-unknown",
          capability_id: capabilityId,
          amount_sgd_cents: amount,
          counterparty_id: counterpartyId,
          action:
            typeof body.action === "string" && body.action.trim()
              ? body.action
              : "PAYMENT_TRANSFER",
          idempotency_key: idempotencyKey,
        },
        {
          svid: bearerToken,
          policy_id:
            typeof body.policy_id === "string" && body.policy_id.trim()
              ? body.policy_id
              : undefined,
          sender_account:
            typeof body.sender_account === "string" && body.sender_account.trim()
              ? body.sender_account
              : undefined,
          receiver_account:
            typeof body.receiver_account === "string" && body.receiver_account.trim()
              ? body.receiver_account
              : undefined,
        },
      );

      const statusCode = result.status === "SETTLED" ? 201 : result.status === "HELD" ? 202 : 422;
      return c.json(result, statusCode);
    },
  );

  return app;
}
