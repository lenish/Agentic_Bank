import type { MiddlewareHandler } from "hono";

/**
 * Bearer token auth middleware.
 * Extracts and validates `Authorization: Bearer <token>` header.
 * Stores raw token string in context as `bearerToken`.
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const authorization = c.req.header("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return c.json({ error: "UNAUTHORIZED" }, 401);
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      return c.json({ error: "UNAUTHORIZED" }, 401);
    }

    c.set("bearerToken", token);
    await next();
  };
}
