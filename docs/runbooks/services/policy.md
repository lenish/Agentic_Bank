# Service Runbook: Policy

**Service Name**: `policy`
**Package**: `packages/policy`
**Description**: Policy engine for enforcing transaction limits and business rules.

## 1. Diagnosis

### Symptoms
*   Transactions being incorrectly blocked by policy rules.
*   Policy updates not propagating to the engine.
*   Shadow policy mode showing high discrepancy with live policy.

### Detection
*   Check logs for `PolicyViolationError` and verify against `packages/policy/src/schema.ts`.
*   Monitor `packages/policy/src/engine.ts` for evaluation errors.
*   Compare live vs shadow results using `packages/policy/src/shadow.ts`.

## 2. Recovery

### Immediate Actions
*   **Revert Policy**: If a recent policy update caused issues, revert to the previous version in `packages/policy/src/store.ts`.
*   **Bypass (Emergency Only)**: In extreme cases, temporarily disable specific non-critical policies.
*   **Service Restart**: Restart the policy engine to reload rules from the store.

### Fix Procedures
*   For incorrect blocks: Update the policy rule in the store and trigger a reload.
*   For propagation issues: Verify the connection between the store and the engine.

## 3. Escalation

*   **SEV1**: If all transactions are being blocked or if critical safety policies are not being enforced.
*   **SEV2**: If shadow mode shows significant unexpected blocks.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead if policy failures lead to MAS sandbox limit breaches.
