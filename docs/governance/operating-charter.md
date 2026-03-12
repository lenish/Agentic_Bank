# Operating Charter: Agentic Bank Pan-Asia (SC Ventures × Execution Team)

**Status**: Draft for Alignment Purposes Only | **Date**: March 2026
**Note**: This document is for alignment purposes only; separate legal agreements are required for formal binding.

---

## 1. Governance Overview

This charter defines the joint governance model between **SC Ventures (SCV)** and the **Execution Team** for the development and commercialisation of the Agent Operating Account (AOA) infrastructure.

We follow the **Zodia archetype**: a separate legal entity structure where SCV typically holds ~90% equity, designed as a spin-out from the start to ensure institutional-grade compliance with startup-speed execution.

The venture operates within the SCV stage-gate model:
1. **Origination** (Complete)
2. **Validation** (In Progress)
3. **Incubation** (Target: Month 1-8)
4. **Commercialisation** (Target: Month 9+)

---

## 2. Directly Accountable Individuals (DRI)

To ensure clear accountability, every deliverable has a single owner. No co-DRI assignments are permitted.

| Role | DRI Name | Accountability |
|------|----------|----------------|
| **SCV Venture Lead** | [TBD] | Regulatory sponsorship, SC network distribution, capital allocation |
| **Delivery Lead** | [TBD] | Product engineering, technical operations, execution velocity |

---

## 3. Reserved Matters

The following actions require explicit approval from the Steering Committee and cannot be executed by the Delivery Lead independently:

1. **Capital Expenditure**: Any single capex item or contract commitment exceeding $3-5M.
2. **Regulatory Licensing**: Submission of formal license applications (e.g., MAS, HKMA, VARA) or changes to regulatory status.
3. **Brand & IP**: Usage of Standard Chartered or SC Ventures branding outside agreed guidelines; filing of new trademarks.
4. **Equity & Structure**: Any changes to the capitalization table, issuance of new shares, or structural pivots.
5. **Strategic Pivot**: Significant shifts in product direction (e.g., moving from B2B infrastructure to B2C neobanking).

---

## 4. KPI Ownership

Success is measured through distinct, non-overlapping KPIs assigned to each party.

| Category | KPI | Owner |
|----------|-----|-------|
| **Growth** | Pilot customer conversion rate | SCV |
| **Ecosystem** | Active sponsor count (SC corporate network) | SCV |
| **Compliance** | Regulatory sandbox approvals (MAS) | SCV |
| **Velocity** | Release predictability (SLA vs. Actual) | Execution Team |
| **Reliability** | System SLO (99.9% uptime) | Execution Team |
| **Recovery** | Mean Time To Recovery (MTTR) < 30 mins | Execution Team |
| **Security** | Zero-finding external security audit pass | Execution Team |

---

## 5. Escalation Triggers & Response Timelines

When critical thresholds are breached, the following escalation paths are triggered:

| Trigger | Escalation Path | Response SLA |
|---------|-----------------|--------------|
| **Critical Security Breach** | Delivery Lead → SCV Venture Lead → SC Group CISO | < 2 Hours |
| **Regulatory Inquiry/Audit Failure** | SCV Venture Lead → Steering Committee | < 24 Hours |
| **Product Launch Delay > 4 Weeks** | Delivery Lead → Steering Committee | < 48 Hours |

---

## 6. Governance Cadence

| Meeting | Frequency | Participants | Focus |
|---------|-----------|--------------|-------|
| **Delivery Sync** | Weekly | Execution Team | Sprint progress, blockers, technical debt |
| **Control Meeting** | Bi-weekly | Delivery Lead + SCV Venture Lead | Risk management, budget tracking, compliance |
| **Steering Committee** | Monthly | SCV Partners + Delivery Lead | Milestone review, resource allocation, stage-gate |
| **Strategy Session** | Quarterly | Board + Founders | Market positioning, expansion roadmap, Series A |

---

## 7. Product Governance Requirements

Per the Oracle architectural review, the following components are non-negotiable product requirements and must be reflected in all decision records:

*   **Capability Delegation**: Bounded tokens for machine-native authorization.
*   **Decision Record Plane**: Immutable audit trail of every agentic financial decision.
*   **Provider Adapters**: Abstraction layer for multi-rail settlement (SGD, HKD, USD).

---

## 8. Alignment Sign-off

*This document serves as the operating manual for the partnership. It will be reviewed and updated at each stage-gate transition.*

**SC Ventures Representative**: ____________________
**Execution Team Representative**: ____________________
