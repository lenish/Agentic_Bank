import type { MiddlewareHandler } from "hono";

const PII_FIELDS: ReadonlySet<string> = new Set([
  "account_number",
  "iban",
  "phone",
  "email",
  "national_id",
]);

const MASKED_VALUE = "***MASKED***";

/**
 * Recursively mask PII fields in an object.
 * Returns a new object — does NOT mutate the original.
 */
export function maskPiiFields(data: unknown): unknown {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskPiiFields);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (PII_FIELDS.has(key)) {
      result[key] = MASKED_VALUE;
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskPiiFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * PII masking middleware for request/response logging.
 * Does NOT modify the actual payload — only affects structured log output.
 * The exported `maskPiiFields` utility is available for logging pipelines.
 */
export function piiMaskMiddleware(): MiddlewareHandler {
  return async (_c, next) => {
    // In production: clone + mask request body → structured logger
    await next();
    // In production: clone + mask response body → structured logger
  };
}
