# Service Runbook: Settlement

**Service Name**: `settlement`
**Package**: `packages/settlement`
**Description**: Multi-rail settlement engine (SGD, HKD, USD).

## 1. Diagnosis

### Symptoms
*   Settlement failures > 1% (SEV2 trigger).
*   Saga orchestration stuck or failing.
*   Idempotency errors causing double-spend or missed payments.

### Detection
*   Check logs for `SettlementError`, `SagaFailure`, or `IdempotencyKeyConflict`.
*   Monitor `packages/settlement/src/sgd-rail.ts` for adapter errors.
*   Verify saga states in `packages/settlement/src/state-machine.ts`.

## 2. Recovery

### Immediate Actions
*   **Retry Saga**: Manually trigger a retry for stuck sagas in `packages/settlement/src/saga.ts`.
*   **Switch Rail**: If one rail is down, switch to an alternative rail if available.
*   **Service Restart**: Restart the settlement service to clear transient network issues with payment rails.

### Fix Procedures
*   For idempotency issues: Clean up the idempotency store in `packages/settlement/src/idempotency.ts`.
*   For adapter failures: Check the status of the external payment rail provider.

## 3. Escalation

*   **SEV1**: If all settlement rails are down or if there is a risk of double-spending.
*   **SEV2**: If settlement failures exceed 1% of total volume.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead for communication with payment rail partners (e.g., SCB).
