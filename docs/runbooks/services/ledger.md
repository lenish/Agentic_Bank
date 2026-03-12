# Service Runbook: Ledger

**Service Name**: `ledger`
**Package**: `packages/ledger`
**Description**: Core accounting system and transaction state machine.

## 1. Diagnosis

### Symptoms
*   Transaction state transitions failing or stuck in `PENDING`.
*   Balance mismatches between accounts.
*   Reconciliation job failures.

### Detection
*   Check logs for `StateTransitionError` or `BalanceMismatchError`.
*   Monitor `packages/ledger/src/reconciliation.ts` output for discrepancies.
*   Verify account states in the database using `packages/ledger/src/account.ts` logic.

## 2. Recovery

### Immediate Actions
*   **Restart Service**: If the service is unresponsive, restart the ledger process.
*   **Rollback**: If a recent deployment caused the issue, rollback to the previous stable version.
*   **Manual Reconciliation**: Run the reconciliation script manually to identify and fix balance errors.

### Fix Procedures
*   For stuck transactions: Use the state machine logic in `packages/ledger/src/state-machine.ts` to manually transition or cancel the transaction.
*   For balance errors: Adjust account balances based on the immutable audit trail.

## 3. Escalation

*   **SEV1**: If data integrity is compromised or core accounting is down. Notify Delivery Lead immediately.
*   **SEV2**: If reconciliation fails for more than 24 hours.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead for regulatory reporting of balance errors.
