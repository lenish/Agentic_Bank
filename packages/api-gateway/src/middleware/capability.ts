import type { MiddlewareHandler } from "hono";

/** Minimal interface matching CapabilityTokenService.getById(). */
export interface CapabilityRecord {
  readonly id: string;
  readonly status: string;
}

/** Dependency-inverted lookup — callers inject CapabilityTokenService or a mock. */
export interface CapabilityLookup {
  getById(id: string): CapabilityRecord | undefined;
}

/**
 * Capability verification middleware.
 * Requires `X-Capability-Id` header and verifies capability is ACTIVE.
 */
export function capabilityMiddleware(lookup: CapabilityLookup): MiddlewareHandler {
  return async (c, next) => {
    const capabilityId = c.req.header("X-Capability-Id");

    if (!capabilityId) {
      return c.json({ error: "CAPABILITY_REQUIRED" }, 403);
    }

    const capability = lookup.getById(capabilityId);

    if (!capability) {
      return c.json(
        { error: "CAPABILITY_INVALID", reason: "CAPABILITY_NOT_FOUND" },
        403,
      );
    }

    if (capability.status !== "ACTIVE") {
      return c.json(
        { error: "CAPABILITY_INVALID", reason: `CAPABILITY_${capability.status}` },
        403,
      );
    }

    c.set("capability", capability);
    await next();
  };
}
