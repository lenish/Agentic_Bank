# AoaBank Regulatory Evidence Index

This index maps regulatory requirements to specific technical evidence within the AoaBank codebase and documentation.

## 1. AML/CFT Evidence (Minimum 3 items)

| Evidence ID | Description | File Path |
|-------------|-------------|-----------|
| **AML-EVD-01** | Structuring detection logic for splitting large transactions | `packages/compliance/src/aml.ts` |
| **AML-EVD-02** | Account takeover detection via counterparty anomaly tracking | `packages/compliance/src/aml.ts` |
| **AML-EVD-03** | Manual review queue for suspicious activity reporting (SAR) | `packages/compliance/src/aml.ts` |
| **AML-EVD-04** | IVMS101 Travel Rule payload validation and transmission | `packages/compliance/src/travel-rule.ts` |

## 2. KYA (Know Your Agent) Evidence (Minimum 3 items)

| Evidence ID | Description | File Path |
|-------------|-------------|-----------|
| **KYA-EVD-01** | SPIFFE-based verifiable identity issuance (SVID) | `packages/kya/src/identity.ts` |
| **KYA-EVD-02** | Agent lifecycle state machine (PENDING -> VERIFIED -> REVOKED) | `packages/kya/src/lifecycle.ts` |
| **KYA-EVD-03** | Step-up authentication triggers for high-risk actions | `packages/kya/src/step-up.ts` |
| **KYA-EVD-04** | Bounded capability tokens with cryptographic enforcement | `packages/kya/src/capability.ts` |

## 3. Audit Trail Evidence (Minimum 3 items)

| Evidence ID | Description | File Path |
|-------------|-------------|-----------|
| **AUD-EVD-01** | Immutable decision record storage with reasoning trace | `packages/compliance/src/decision-record.ts` |
| **AUD-EVD-02** | 7-year retention policy enforcement in storage layer | `packages/compliance/src/decision-record.ts` |
| **AUD-EVD-03** | Policy versioning and model snapshot attribution | `packages/compliance/src/decision-record.ts` |
| **AUD-EVD-04** | Double-entry append-only ledger integrity | `packages/ledger/src/ledger.ts` |

## 4. Governance & Strategy Evidence

| Evidence ID | Description | File Path |
|-------------|-------------|-----------|
| **GOV-EVD-01** | Operating Charter defining SCV partnership and DRI roles | `docs/governance/operating-charter.md` |
| **GOV-EVD-02** | MAS Sandbox Application Draft and Boundary Proposal | `docs/regulatory/mas-sandbox-application.md` |
| **GOV-EVD-03** | Regulatory Control Matrix mapping controls to code | `docs/regulatory/control-matrix.md` |
| **GOV-EVD-04** | Entity structure and legal partner shortlist | `docs/regulatory/entity-structure.md` |

---

*Generated on 2026-03-12 for MAS Sandbox Evidence Package.*
