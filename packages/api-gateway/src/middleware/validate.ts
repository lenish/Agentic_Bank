import type { MiddlewareHandler } from "hono";

/** A single validation issue with path and message. */
export interface ValidationIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
}

/** Schema-agnostic validation interface (compatible with Zod's safeParse). */
export interface ValidationSchema {
  safeParse(data: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: ReadonlyArray<ValidationIssue> } };
}

/**
 * Request body schema validation middleware.
 * Accepts any schema implementing the `safeParse` interface (e.g. Zod).
 */
export function validateMiddleware(schema: ValidationSchema): MiddlewareHandler {
  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: "VALIDATION_ERROR",
          details: [{ path: "", message: "Invalid JSON body" }],
        },
        400,
      );
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ error: "VALIDATION_ERROR", details }, 400);
    }

    await next();
  };
}
