# Pilot Customer Onboarding Guide

## Overview

This guide walks enterprise customers through the Agentic Bank (AOA) pilot onboarding process under the MAS Regulatory Sandbox. Pilot participants are selected from the SC Ventures network and operate under Free tier pricing (100 transactions/month).

**Sandbox Restrictions**: Customer cap 50-200, SG-only geography, transaction limits per MAS conditions, monthly reporting required.

---

## Prerequisites

- Active entity registration in Singapore (ACRA)
- Designated technical contact and compliance officer
- Signed pilot participation agreement with SC Ventures

---

## Step 1: Account Creation

**Duration**: 1 business day

1. AOA operations team creates a **master account** for the enterprise customer.
2. Two **agent sub-accounts** are provisioned automatically:
   - **Payment Processing Agent** — executes authorized payments within capability bounds.
   - **Reconciliation Agent** — reads transaction history and generates settlement reports.
3. All accounts are initialized on the **FREE** tier (100 transactions/month, SGD only).

**Deliverables**: Master account ID, agent sub-account IDs, API credentials (SVID tokens).

---

## Step 2: Know Your Agent (KYA) Verification

**Duration**: 1-3 business days

1. Each agent receives a **SPIFFE-based identity** (`spiffe://aoa.local/agent/{agentId}`).
2. Short-lived JWT SVIDs are issued with claims: `sub`, `spiffe_id`, `owner_id`, `iat`, `exp`.
3. Owner-agent attribution is recorded in the KYA registry.
4. KYA lifecycle: `PENDING` -> `VERIFIED` (after identity validation).

**Verification Criteria**:
- Agent owner matches customer master account.
- SVID can be verified against KYA service.
- Agent appears in customer's agent roster.

---

## Step 3: Capability Delegation

**Duration**: Same day (after KYA verification)

1. **Capability tokens** are minted for each agent with specific bounds:
   - `action_set`: Permitted operations (e.g., `["PAYMENT_TRANSFER"]`).
   - `amount_limit_sgd_cents`: Maximum per-transaction amount.
   - `counterparty_scope`: Allowed counterparty list.
   - `ttl_seconds`: Token validity period.
   - `max_frequency_per_hour`: Rate limit.
2. Capabilities are **non-transferable** (`non_transferable: true`).
3. Step-up policy triggers for amounts > SGD 10,000.

**Verification**: Agent can call `/api/v1/accounts/:id/balance` with valid capability token.

---

## Step 4: First Payment (Go-Live Transaction)

**Duration**: Within first week

Execute a live transaction through the full payment pipeline:

1. **Submit payment** via `POST /api/v1/payments` with:
   - `amount`: Transaction amount in SGD cents (positive integer).
   - `to`: Counterparty ID.
   - `agent_id`: Executing agent's ID.
   - Valid `Authorization: Bearer {SVID}` header.
   - `X-Capability-Id` header referencing the agent's capability token.

2. **Pipeline stages** (all must pass):
   - KYA Verify — confirms agent identity matches SVID.
   - Capability Check — validates action within delegated bounds.
   - Policy Eval — deny-by-default PDP evaluation.
   - Risk Score — pre-trade risk rules (15 rules, score 0-100).
   - Settlement Execute — SGD rail submission + confirmation.
   - Ledger Update — double-entry posting.
   - Decision Record — immutable compliance audit trail.

3. **Expected response**: `201 Created` with `status: "SETTLED"`.

---

## Step 5: Post-Transaction Verification

1. Confirm transaction appears in **ledger** (double-entry balanced).
2. Verify **decision record** was created in compliance store.
3. Check **reconciliation** matches between ledger and settlement rail.
4. Review transaction in **ops dashboard** KPI aggregator.

---

## Step 6: Feedback Collection

**Duration**: End of pilot week 1

1. Complete the NPS survey (0-10 score).
2. Answer 3 CSAT questions on onboarding, API usability, and documentation.
3. Provide open-ended comments on improvement areas.

See `pilot-feedback-template.md` for the full questionnaire.

---

## Pilot Timeline

| Week | Milestone |
|------|-----------|
| 1 | Account creation + KYA verification + first transaction |
| 2-4 | Regular transaction processing, capability tuning |
| 4 | Mid-pilot feedback collection |
| 8 | Pilot conclusion, full feedback, report generation |

---

## Support Channels

- **Technical**: Dedicated Slack channel `#aoa-pilot-{customer-name}`
- **Escalation**: SEV1 incidents follow the incident playbook (see `docs/runbooks/`)
- **Account Manager**: SC Ventures liaison for commercial/regulatory queries

---

## Pilot Exit Criteria

A customer's pilot is **COMPLETED** when:
1. At least 1 live transaction settled successfully.
2. NPS feedback collected.
3. No unresolved SEV1/SEV2 incidents.

Upon completion, customers may transition to production under the SPI license (post-sandbox).
