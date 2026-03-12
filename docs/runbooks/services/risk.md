# Service Runbook: Risk

**Service Name**: `risk`
**Package**: `packages/risk`
**Description**: Real-time risk assessment and fraud detection engine.

## 1. Diagnosis

### Symptoms
*   High rate of false positives in fraud detection.
*   Risk scoring latency exceeding SLAs.
*   Risk rules not being applied correctly.

### Detection
*   Check logs for `RiskScoreError` or `RuleEvaluationError`.
*   Monitor `packages/risk/src/engine.ts` for performance metrics.
*   Verify rule definitions in `packages/risk/src/rules.ts`.

## 2. Recovery

### Immediate Actions
*   **Adjust Thresholds**: Temporarily increase risk thresholds if false positives are blocking legitimate traffic.
*   **Rollback Rules**: Revert to a previous set of risk rules in `packages/risk/src/rules.ts`.
*   **Service Restart**: Restart the risk engine to clear memory or connection issues.

### Fix Procedures
*   For latency issues: Optimize rule evaluation logic or increase resource allocation.
*   For rule errors: Fix the logic in `packages/risk/src/rules.ts` and redeploy.

## 3. Escalation

*   **SEV1**: If the risk engine is down, allowing potentially fraudulent transactions to pass without check.
*   **SEV2**: If false positives exceed 5% of total transaction volume.
*   **Contact**: Delivery Lead for technical issues; SCV Venture Lead for reporting potential fraud incidents.
