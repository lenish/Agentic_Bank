# Service Runbook: Compliance

**Service Name**: `compliance`
**Package**: `packages/compliance`
**Description**: AML, Travel Rule, and regulatory reporting service.

## 1. Diagnosis

### Symptoms
*   AML screening failing or timing out.
*   Travel Rule data not being correctly attached to transactions.
*   Immutable decision records not being written to the store.

### Detection
*   Check logs for `AMLError`, `TravelRuleViolation`, or `DecisionRecordStoreError`.
*   Monitor `packages/compliance/src/aml.ts` for screening failures.
*   Verify decision records in `packages/compliance/src/store.ts`.

## 2. Recovery

### Immediate Actions
*   **Manual Screening**: For critical transactions, perform manual AML screening.
*   **Re-sync Records**: Trigger a re-sync of decision records to the immutable store.
*   **Service Restart**: Restart the compliance service to clear connection issues with external AML providers.

### Fix Procedures
*   For Travel Rule issues: Update the schema or logic in `packages/compliance/src/travel-rule.ts`.
*   For store failures: Verify the integrity of the underlying database or storage layer.

## 3. Escalation

*   **SEV1**: If AML screening is down, or if immutable decision records are being lost.
*   **SEV2**: If Travel Rule compliance cannot be verified for cross-border transactions.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead for regulatory reporting and MAS communication.
