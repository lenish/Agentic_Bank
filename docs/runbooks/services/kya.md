# Service Runbook: KYA (Know Your Agent)

**Service Name**: `kya`
**Package**: `packages/kya`
**Description**: Identity verification and lifecycle management for autonomous agents.

## 1. Diagnosis

### Symptoms
*   Agent onboarding failing during identity verification.
*   Capability delegation tokens not being issued.
*   Step-up authentication requests failing.

### Detection
*   Check logs for `IdentityVerificationError` or `TokenIssuanceError`.
*   Monitor `packages/kya/src/identity.ts` for verification failures.
*   Verify agent lifecycle states in `packages/kya/src/lifecycle.ts`.

## 2. Recovery

### Immediate Actions
*   **Clear Cache**: If identity data is stale, clear the KYA cache.
*   **Manual Override**: For critical agents, use the manual override in `packages/kya/src/store.ts` to update status.
*   **Service Restart**: Restart the KYA service to clear transient connection issues with identity providers.

### Fix Procedures
*   For failed verifications: Re-trigger the verification process after ensuring the agent's metadata is correct.
*   For token issues: Revoke and re-issue capability tokens using `packages/kya/src/capability.test.ts` as a reference for valid flows.

## 3. Escalation

*   **SEV1**: If all agent onboarding is blocked or existing agent tokens are invalid.
*   **SEV2**: If step-up authentication is failing for specific high-value transactions.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead if identity verification failures impact MAS sandbox compliance.
