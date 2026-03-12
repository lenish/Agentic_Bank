# Service Runbook: API Gateway

**Service Name**: `api-gateway`
**Package**: `packages/api-gateway`
**Description**: Entry point for all agentic and administrative requests.

## 1. Diagnosis

### Symptoms
*   High rate of 5xx errors for all incoming requests.
*   Authentication or authorization failures for valid tokens.
*   Rate limiting being applied incorrectly.

### Detection
*   Check logs for `GatewayError`, `AuthFailure`, or `RateLimitExceeded`.
*   Monitor `packages/api-gateway/src/gateway.ts` for routing errors.
*   Verify middleware execution in `packages/api-gateway/src/middleware/`.

## 2. Recovery

### Immediate Actions
*   **Flush Rate Limit Cache**: If rate limiting is incorrectly blocking traffic, flush the cache.
*   **Rollback Middleware**: If a recent middleware change caused issues, rollback to the previous version.
*   **Service Restart**: Restart the gateway to clear transient connection or memory issues.

### Fix Procedures
*   For auth issues: Verify the connection to the KYA service and the validity of signing keys.
*   For PII masking errors: Check the configuration in `packages/api-gateway/src/middleware/pii-mask.ts`.

## 3. Escalation

*   **SEV1**: If the gateway is down, blocking all access to the bank infrastructure.
*   **SEV2**: If authentication is failing for a significant portion of users.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead if the outage impacts external partners or customers.
