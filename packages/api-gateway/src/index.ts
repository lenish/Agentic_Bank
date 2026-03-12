// Gateway factory
export { createGateway } from "./gateway";
export type { GatewayOptions } from "./gateway";
export { PaymentPipeline } from "./pipeline";
export type {
  PaymentPipelineContext,
  PaymentPipelineServices,
  PaymentRequest,
  PaymentResult,
  PipelineStage,
} from "./pipeline";

// Middleware
export { authMiddleware } from "./middleware/auth";
export { capabilityMiddleware } from "./middleware/capability";
export type { CapabilityLookup, CapabilityRecord } from "./middleware/capability";
export { rateLimitMiddleware } from "./middleware/rate-limit";
export type { RateLimitOptions } from "./middleware/rate-limit";
export { piiMaskMiddleware, maskPiiFields } from "./middleware/pii-mask";
export { validateMiddleware } from "./middleware/validate";
export type { ValidationSchema, ValidationIssue } from "./middleware/validate";

// Pilot Onboarding
export { PilotOnboardingService, PILOT_CUSTOMERS } from "./onboarding";
export type {
  PilotCustomer,
  AgentSubAccount,
  MasterAccount,
  OnboardingResult,
  OnboardingStatus,
  TransactionRecord,
  FeedbackRecord,
  PilotReport,
} from "./onboarding";

// Pricing / Billing
export { PricingEngine, createBillingRoutes } from "./pricing";
export {
  FREE_TIER_LIMIT,
  TRANSACTION_COST_CENTS,
  PREMIUM_DECISION_COST_CENTS,
  API_CALL_COST_CENTS,
} from "./pricing";
export type {
  UsageType,
  UsageRecord,
  FreeTierResult,
  Invoice,
  InvoiceLineItem,
  UsageSummary,
  PricingTier,
  AccountTier,
} from "./pricing";
