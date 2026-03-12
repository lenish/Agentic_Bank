import type { MiddlewareHandler } from "hono";

const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_WINDOW_MS = 60_000; // 60 seconds

export interface RateLimitOptions {
  /** Maximum requests allowed within the window. Default: 100 */
  readonly maxRequests?: number;
  /** Sliding window duration in milliseconds. Default: 60 000 */
  readonly windowMs?: number;
}

/**
 * In-memory sliding-window rate limiter keyed by client IP.
 * Cleans stale timestamps on each check to prevent unbounded growth.
 */
export function rateLimitMiddleware(options: RateLimitOptions = {}): MiddlewareHandler {
  const max = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const store = new Map<string, number[]>();

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now();
    const cutoff = now - windowMs;

    // Prune timestamps outside the sliding window
    const timestamps = (store.get(ip) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= max) {
      return c.json({ error: "RATE_LIMIT_EXCEEDED" }, 429);
    }

    timestamps.push(now);
    store.set(ip, timestamps);
    await next();
  };
}
