// Gateway factory
export { createGateway } from "./gateway";
export type { GatewayOptions } from "./gateway";

// Middleware
export { authMiddleware } from "./middleware/auth";
export { capabilityMiddleware } from "./middleware/capability";
export type { CapabilityLookup, CapabilityRecord } from "./middleware/capability";
export { rateLimitMiddleware } from "./middleware/rate-limit";
export type { RateLimitOptions } from "./middleware/rate-limit";
export { piiMaskMiddleware, maskPiiFields } from "./middleware/pii-mask";
export { validateMiddleware } from "./middleware/validate";
export type { ValidationSchema, ValidationIssue } from "./middleware/validate";
