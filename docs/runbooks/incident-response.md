# Incident Response Playbook

This document outlines the procedures for managing technical incidents at Agentic Bank. It ensures rapid recovery, clear communication, and regulatory compliance.

## 1. Incident Classification

Incidents are classified based on impact and urgency.

| Severity | Description | Response SLA | Escalation SLA |
| :--- | :--- | :--- | :--- |
| **SEV1** | Complete service outage, data loss risk, or security breach. | 15 minutes | SCV Venture Lead notified within 30 minutes. |
| **SEV2** | Partial service degradation or settlement failures > 1%. | 1 hour | Delivery Lead notified within 1 hour. |
| **SEV3** | Minor issues or single feature degradation. | 4 hours | Delivery Lead notified within 24 hours. |

## 2. Response Procedures

### Phase 1: Detection and Identification
*   Monitor system alerts via Dashboard and Messenger Bot.
*   Verify the issue through logs and service health checks.
*   Determine the severity level based on the classification table.

### Phase 2: Containment and Diagnosis
*   Assign an Incident Commander (IC) for SEV1 and SEV2 incidents.
*   Isolate affected services to prevent further impact.
*   Use service-specific runbooks in `docs/runbooks/services/` for diagnosis.

### Phase 3: Recovery
*   Implement fixes or roll back recent changes.
*   Verify recovery through automated tests and manual checks.
*   Target Mean Time To Recovery (MTTR) is less than 30 minutes for all critical services.

### Phase 4: Communication
*   **SEV1**: Continuous updates every 30 minutes to stakeholders.
*   **SEV2**: Updates every 2 hours.
*   **SEV3**: Updates via daily delivery sync.

## 3. Escalation

Follow the `docs/runbooks/escalation-matrix.md` for time-based escalation.

*   **Security Breaches**: Delivery Lead must notify SCV Venture Lead and SC Group CISO within 2 hours.
*   **Regulatory Impact**: Any incident affecting MAS sandbox limits must be escalated to the SCV Venture Lead immediately.

## 4. Post-Incident

A postmortem must be completed for all SEV1 and SEV2 incidents within 48 hours of resolution. Use the `docs/runbooks/postmortem-template.md`.
