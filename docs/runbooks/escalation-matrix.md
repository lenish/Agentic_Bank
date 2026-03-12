# Escalation Matrix

This matrix defines the time-based escalation paths for technical incidents.

## 1. SEV1 Escalation (Critical)

| Time Elapsed | Action | Responsible |
| :--- | :--- | :--- |
| **0 - 15 min** | Initial response and triage. Start incident bridge. | On-call Engineer |
| **15 - 30 min** | Notify Delivery Lead. Assign Incident Commander. | On-call Engineer |
| **30 - 60 min** | Notify SCV Venture Lead. Provide initial impact assessment. | Delivery Lead |
| **60 min+** | Notify SC Group CISO (if security breach). Notify Steering Committee. | SCV Venture Lead |

## 2. SEV2 Escalation (High)

| Time Elapsed | Action | Responsible |
| :--- | :--- | :--- |
| **0 - 30 min** | Initial response and triage. | On-call Engineer |
| **30 - 60 min** | Notify Delivery Lead if resolution is not imminent. | On-call Engineer |
| **60 - 120 min** | Notify SCV Venture Lead if regulatory impact is suspected. | Delivery Lead |
| **120 min+** | Provide status update to SCV Venture Lead. | Delivery Lead |

## 3. SEV3 Escalation (Medium/Low)

| Time Elapsed | Action | Responsible |
| :--- | :--- | :--- |
| **0 - 4 hours** | Initial response and triage. | On-call Engineer |
| **4 - 24 hours** | Notify Delivery Lead via daily sync. | On-call Engineer |
| **24 hours+** | Update ticket status and plan for fix in next sprint. | Delivery Lead |

## 4. Contact Roles

*   **On-call Engineer**: Primary responder for technical issues.
*   **Delivery Lead**: Accountable for technical operations and execution velocity.
*   **SCV Venture Lead**: Accountable for regulatory sponsorship and capital allocation.
*   **SC Group CISO**: Escalation point for critical security breaches.
