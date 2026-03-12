# AoaBank Regulatory Control Matrix

| Control ID | Control Description | Implementation Status | Evidence File | Notes |
|------------|---------------------|-----------------------|---------------|-------|
| **KYA-01** | SPIFFE-based agent identity issuance | IMPLEMENTED | `packages/kya/src/identity.ts` | Task 6 |
| **KYA-02** | Agent lifecycle state machine (PENDING to REVOKED) | IMPLEMENTED | `packages/kya/src/lifecycle.ts` | Task 6 |
| **KYA-03** | Step-up authentication for high-risk actions | IMPLEMENTED | `packages/kya/src/step-up.ts` | Task 6 |
| **CAP-01** | Bounded capability tokens (amount, action, TTL) | IMPLEMENTED | `packages/kya/src/capability.ts` | Task 7 |
| **POL-01** | Deny-by-default policy engine (PDP) | IMPLEMENTED | `packages/policy/src/engine.ts` | Task 9 |
| **RSK-01** | Pre-trade risk evaluation (15 rules) | IMPLEMENTED | `packages/risk/src/engine.ts` | Task 12 |
| **AML-01** | Structuring detection (FATF typology) | IMPLEMENTED | `packages/compliance/src/aml.ts` | Task 19 |
| **AML-02** | Account takeover detection | IMPLEMENTED | `packages/compliance/src/aml.ts` | Task 19 |
| **AML-03** | Manual review queue for suspicious activity | IMPLEMENTED | `packages/compliance/src/aml.ts` | Task 19 |
| **TRV-01** | IVMS101 Travel Rule transmission (>S$1,500) | IMPLEMENTED | `packages/compliance/src/travel-rule.ts` | Task 20 |
| **AUD-01** | Immutable decision record storage | IMPLEMENTED | `packages/compliance/src/decision-record.ts` | Task 8 |
| **AUD-02** | 7-year record retention policy | IMPLEMENTED | `packages/compliance/src/decision-record.ts` | Task 8 |
| **AUD-03** | Decision reasoning and policy version trace | IMPLEMENTED | `packages/compliance/src/decision-record.ts` | Task 8 |
| **PRV-01** | PII masking for operational logs | IMPLEMENTED | `packages/compliance/src/privacy.ts` | Task 25 |
| **PRV-02** | PDPA compliance checklist | IMPLEMENTED | `packages/compliance/src/privacy.ts` | Task 25 |
| **DSP-01** | Automated dispute case management | IMPLEMENTED | `packages/compliance/src/dispute.ts` | Task 21 |
| **DSP-02** | Auto-refund threshold (<S$50) | IMPLEMENTED | `packages/compliance/src/dispute.ts` | Task 21 |
| **LDG-01** | Double-entry append-only ledger | IMPLEMENTED | `packages/ledger/src/ledger.ts` | Task 5 |
| **SET-01** | Settlement state machine with escrow support | IMPLEMENTED | `packages/settlement/src/state-machine.ts` | Task 14 |
| **SET-02** | SGD domestic rail adapter (FAST/GIRO) | IMPLEMENTED | `packages/settlement/src/sgd-rail.ts` | Task 14 |
| **OPS-01** | Human-in-the-loop override mechanism | PARTIAL | `packages/kya/src/step-up.ts` | Logic implemented, UI pending |
| **OPS-02** | Global kill-switch for agent operations | IMPLEMENTED | `packages/policy/src/engine.ts` | Via policy revocation |
| **SEC-01** | Secrets management via 1Password | IMPLEMENTED | `.env.tpl` | Task 3 |
| **SEC-02** | Ed25519 settlement signing | IMPLEMENTED | `packages/settlement/src/signing.ts` | Task 11 |
| **REP-01** | Monthly sandbox progress reporting | PLANNED | N/A | To be implemented in Phase 2 |
| **WND-01** | Orderly wind-down procedure | PLANNED | `docs/regulatory/mas-sandbox-application.md` | Documented in exit strategy |
