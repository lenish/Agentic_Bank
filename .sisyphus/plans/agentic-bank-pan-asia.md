# Agentic Bank — Pan-Asia Venture Plan (SC Ventures × Hashed × Execution Team)

## TL;DR

> **Quick Summary**: Build trusted financial execution infrastructure for the age of autonomous economic agents, in partnership with SC Ventures and Hashed. Singapore (MAS sandbox) first, then Pan-Asia expansion. Core product: **Agent Operating Account (AOA)** — B2B infra enabling enterprises to create per-agent sub-accounts with policy-bound spending, settlement, and audit via API + messenger.
>
> **Deliverables**:
> - 8-Layer Agentic Banking Stack (KYA → Wallet → Policy → Risk → Blockchain Infra → Stablecoin Settlement → Dispute → Compliance)
> - SC Ventures Joint Operating Model (Operating Charter)
> - MAS Regulatory Sandbox Entry
> - OMO-style Messenger-First UX (Telegram/Slack → Financial Commands)
> - Pan-Asia GTM Strategy
>
> **Estimated Effort**: XL (12-month full venture build)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Entity Setup → KYA+Ledger Core → Policy+Risk → Settlement+Compliance → Commercial Launch

---

## Context

### Original Request
Build Agentic Banking Infrastructure as a joint venture with SC Ventures and Hashed. Starting from the core question: "If all agents can perform economic activity, what role should banks play?" Pan-Asia scope, Singapore first.

### Interview Summary
**Key Discussions**:
- Redefining the bank's role: from custody/transfer → integrated trust OS for delegation-policy-risk-settlement-liability
- 8 infrastructure layers defined (7 original + Blockchain Infra + Stablecoin Settlement added later) + Oracle reviewed twice
- SC Ventures × Hashed work split: SCV = origination/regulatory/distribution, Hashed = blockchain infra/crypto ecosystem/Web3 network, Us = product/eng/ops
- OMO.bot patterns applied: messenger-first, pipeline visualization, growth maturity model, token-based pricing

**Research Findings**:
- SPIFFE/SPIRE + OAuth mTLS + VC/DID (identity), OPA/Cedar (policy), Kafka/Flink (risk), Tazama/Osprey (AML)
- SC Ventures portfolio archetypes: Zodia (regulatory spin-out), Nexus (BaaS), Libeara (sandbox pioneer)
- Oracle critical additions: Capability Token, Decision Record, Provider Adapter are launch-critical
- ISO 20022 structured address Nov 2026, MiCA CASP Jul 2026, MAS sandbox entry feasible

### Metis/Oracle Review (Addressed)
**Identified Gaps**:
- Missing delegation model → Resolved with Capability Token
- Missing idempotency boundaries → E2E canonical request_id + semantic hash
- Model governance not productized → Model registry + version pin + kill-switch
- Travel Rule vendor lock-in → Provider adapter + IVMS101 canonical schema
- Entity structure undefined → Separate legal entity (Zodia model)
- SG regulatory strategy vague → MAS FinTech Regulatory Sandbox application

---

## Work Objectives

### Core Objective
Build bank-grade infrastructure for safe execution, settlement, and auditing of autonomous agent economic activity, and acquire first commercial customers in Singapore via SC Ventures and Hashed networks.

### Concrete Deliverables
1. **Entity incorporation** + MAS Regulatory Sandbox application
2. **8-Layer tech stack** MVP (SGD domestic transfer + stablecoin rails, small-amount limits)
3. **Agent Operating Account (AOA)** API + Telegram/Slack interfaces
4. **Operating Charter** (SC Ventures joint governance document)
5. **3+ pilot customers** (SC network enterprises)
6. **Regulatory evidence package** (AML/KYA/audit trail)

### Definition of Done
- [ ] AOA API: agent creation → policy setup → spend execution → audit query E2E complete
- [ ] Settlement success rate > 99.95%, reconciliation break < 0.1%
- [ ] Decision record 100% immutable storage + queryable
- [ ] MAS sandbox approved or application submitted
- [ ] 3 pilot customer LOIs secured

### Must Have
- Capability-based delegation (authentication ≠ delegation)
- Decision Record plane (all approvals/rejections immutably recorded)
- Deny-by-default policy engine
- Double-entry ledger (source of truth)
- HSM/KMS-based key separation (agent runtime ≠ signing key)
- E2E idempotency (API + event + webhook)
- AML rule engine v1 + Travel Rule adapter interface

### Must NOT Have (Guardrails)
- Agents must NOT hold long-term signing keys directly
- Unlimited autonomous execution forbidden (always bounded autonomy)
- Automatic model deployment forbidden (canary/shadow + approval gate required)
- Phase 2 items like SpiceDB/Graph risk must NOT be introduced early
- Multi-rail/multi-asset limited in Phase 1 (SGD domestic + USDC/USDT stablecoin only; other fiat currencies and exotic tokens forbidden)
- Direct exposure of bank's main balance sheet forbidden (separate entity structure)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION for technical verification** — ALL code/infra/QA verification is agent-executed.
>
> **Explicit Human-Dependent Gates** (outside agent QA scope):
> - MAS sandbox application submission and approval — requires legal counsel + regulatory team (SCV responsibility)
> - Pilot customer LOI signatures — requires SCV business development + customer sign-off
> - External penetration test report — requires third-party security firm engagement
>
> For these items, agents verify the **artifacts exist** (e.g., signed PDF in `docs/legal/`, LOI template completed, pentest report uploaded) but do not execute the human business process itself.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: YES (TDD) — mandatory for financial systems
- **Framework**: bun test / vitest (TypeScript), pytest (Python model serving)
- **If TDD**: Each task follows RED → GREEN → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Frontend/Dashboard**: Playwright — Navigate, interact, assert DOM, screenshot
- **CLI/Messenger Bot**: Bash (curl to bot webhook) — Simulate messages via HTTP, validate responses
- **Ledger/Settlement**: Bash (bun/node REPL) — Import, call functions, compare balances

### Telegram Mock Transport (applies to all Telegram QA)
> All Telegram bot QA scenarios MUST use the HTTP-based mock transport, NOT interactive tmux UI.
> The bot exposes `POST /api/v1/telegram/webhook` (Telegram Update webhook simulation).
> QA sends a simulated Telegram Update JSON via curl, and reads the bot's response from a
> mock callback endpoint (`npx http-echo-server --port 9997`).
>
> **Standard Telegram QA Pattern:**
> ```
> Preconditions:
>   - Start response mock: `npx http-echo-server --port 9997 &`
>   - Set env: TELEGRAM_BOT_TOKEN=test-token, TELEGRAM_RESPONSE_URL=http://localhost:9997/tg-response
> Steps:
>   1. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
>        -H "Content-Type: application/json" \
>        -d '{"update_id":1,"message":{"message_id":1,"from":{"id":12345},"chat":{"id":12345},"text":"<command>"}}'
>   2. curl http://localhost:9997/__requests | jq '.[-1].body' → assert response content
>   3. Kill mock: kill %1
> ```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Month 0-2 — Foundation + Entity):
├── Task 1: Operating Charter (joint with SC Ventures) [writing]
├── Task 2: Entity incorporation + MAS sandbox prep [unspecified-high]
├── Task 3: Project scaffolding + monorepo + CI/CD [quick]
├── Task 4: Type definitions + API schema (OpenAPI) [quick]
├── Task 5: Double-entry ledger core + account model [deep]
├── Task 6: KYA identity service (SPIFFE ID + OAuth mTLS) [deep]
├── Task 7: Capability token mint/revoke/verify [deep]
└── Task 8: Decision record storage + query API [unspecified-high]

Wave 2 (Month 2-5 — Core Modules, MAX PARALLEL):
├── Task 9: Policy engine (OPA/Cedar, deny-by-default) [deep]
├── Task 10: Agent wallet/sub-account service [unspecified-high]
├── Task 11: Signing service (HSM/KMS integration) [deep]
├── Task 12: Pre-trade risk rules engine (top-15 rules) [deep]
├── Task 13: Idempotency + outbox + saga orchestrator [deep]
├── Task 14: Settlement state machine (SGD rail adapter) [unspecified-high]
├── Task 15: Messenger bot (Telegram MVP) [quick]
├── Task 16: AOA API gateway + auth middleware [unspecified-high]
└── Task 17: Intent pipeline visualization (OMO-style) [visual-engineering]

Wave 3 (Month 5-8 — Integration + Compliance + UX):
├── Task 18: E2E settlement flow integration [deep]
├── Task 19: AML rule engine v1 (Osprey-based) [unspecified-high]
├── Task 20: Travel Rule adapter interface (IVMS101) [unspecified-high]
├── Task 21: Dispute/case management service [unspecified-high]
├── Task 22: Reconciliation engine [deep]
├── Task 23: Ops dashboard (real-time KPI) [visual-engineering]
├── Task 24: Maturity ladder UX (Rule-only → Bounded Autonomy) [visual-engineering]
├── Task 25: Privacy/audit controls + data governance [unspecified-high]
└── Task 26: Slack bot integration [quick]

Wave 4 (Month 8-12 — Launch + Scale):
├── Task 27: MAS sandbox evidence package [writing]
├── Task 28: Security audit + penetration test [unspecified-high]
├── Task 29: Pilot customer onboarding (3 accounts) [unspecified-high]
├── Task 30: Load/stress testing + SLO tuning [deep]
├── Task 31: Model risk governance framework [deep]
├── Task 32: Landing page + GTM materials [visual-engineering]
├── Task 33: Incident playbook + runbook [writing]
└── Task 34: Commercial pricing engine (free + token) [unspecified-high]

Wave FINAL (After ALL — Independent Review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality + security review (unspecified-high)
├── Task F3: E2E QA — full customer journey (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T3 → T5 → T7 → T9 → T13 → T18 → T22 → T29 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 8 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2, all |
| 2 | 1 | 27 |
| 3 | — | 4-8, all eng |
| 4 | 3 | 9-16 |
| 5 | 3 | 10, 13, 14, 18, 22 |
| 6 | 3 | 7, 16 |
| 7 | 6 | 9, 10, 16 |
| 8 | 3 | 9, 12, 18, 19 |
| 9 | 4, 7, 8 | 12, 18 |
| 10 | 5, 7 | 14, 18 |
| 11 | 3 | 14, 18 |
| 12 | 4, 8 | 18 |
| 13 | 5 | 14, 18 |
| 14 | 5, 10, 11, 13 | 18 |
| 15 | 4, 16 | 26 |
| 16 | 4, 6, 7 | 15, 17 |
| 17 | 16 | 24 |
| 18 | 9, 10, 12, 13, 14 | 19, 22, 29 |
| 19 | 8, 18 | 27 |
| 20 | 4 | 27 |
| 21 | 5, 8 | 27 |
| 22 | 5, 18 | 29 |
| 23 | 8, 18 | 29 |
| 24 | 17 | 29 |
| 25 | 8 | 27, 29 |
| 26 | 15 | 29 |
| 27 | 2, 19, 20, 21, 25 | F1 |
| 28 | 18 | 29 |
| 29 | 18, 22, 23, 24, 26, 28 | F1-F4 |
| 30 | 18 | 29 |
| 31 | 8, 12 | 27 |
| 32 | — | 29 |
| 33 | 18 | 29 |
| 34 | 5, 10 | 29 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 8 | T1→writing, T2→unspecified-high, T3-4→quick, T5-7→deep, T8→unspecified-high |
| 2 | 9 | T9,11-13→deep, T10,14,16→unspecified-high, T15→quick, T17→visual-engineering |
| 3 | 9 | T18,22→deep, T19-21,25→unspecified-high, T23-24→visual-engineering, T26→quick |
| 4 | 8 | T27,33→writing, T28-29,34→unspecified-high, T30-31→deep, T32→visual-engineering |
| FINAL | 4 | F1→oracle, F2-F3→unspecified-high, F4→deep |

---

## TODOs

### Wave 1: Foundation + Entity (Month 0-2)

- [x] 1. Operating Charter (joint with SC Ventures)

  **What to do**:
  - Draft 1-page Operating Charter: roles/DRI/decision rights/KPIs/escalation triggers
  - Specify SCV Venture Lead + our Delivery Lead
  - Reserved matters list (capex >$3-5M, regulatory license applications, brand usage, etc.)
  - Governance cadence: weekly Delivery / bi-weekly Control / monthly Steering / quarterly Strategy
  - KPI ownership mapping: SCV (pilot conversion rate, sponsor count), Us (release predictability, SLO, MTTR)

  **Must NOT do**:
  - No co-DRI assignments (one deliverable = one owner)
  - Do not draft as legally binding contract (separate legal review needed)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, all subsequent tasks (context dependency)
  - **Blocked By**: None

  **References**:
  - SC Ventures About/Operating Model: https://scventures.io/about/
  - SC Ventures Discover (Co-creation): https://scventures.io/discover
  - Zodia/Nexus/Libeara archetypes (separate legal entity structure, regulatory sandbox usage)
  - Oracle review: capability delegation, decision record, provider adapter must be included
  - Venture Studio Forum governance framework

  **Acceptance Criteria**:
  - [ ] 1-page markdown document completed
  - [ ] SCV-side DRI / our-side DRI specified
  - [ ] 5+ reserved matters defined
  - [ ] KPI ownership table included
  - [ ] 3+ escalation triggers defined

  **QA Scenarios**:
  ```
  Scenario: Operating Charter completeness
    Tool: Bash (grep/wc)
    Steps:
      1. Verify "DRI", "Reserved", "KPI", "Escalation" sections exist in document
      2. Each section has minimum 3 lines of content
    Expected Result: 4 sections all present, each with 3+ lines
    Evidence: .sisyphus/evidence/task-1-charter-completeness.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-1: docs(governance): add operating charter for SCV partnership`

- [x] 2. Entity incorporation + MAS sandbox preparation

  **What to do**:
  - Compile Singapore entity incorporation requirements (ACRA registration, director requirements, capital)
  - Analyze MAS FinTech Regulatory Sandbox application requirements and create checklist
  - Determine required license type: Payment Services Act (PSA) — Major/Standard Payment Institution
  - Design entity structure: separate legal entity (Zodia model) — including SC Ventures equity structure
  - Create legal/accounting partner shortlist

  **Must NOT do**:
  - Do not execute actual entity registration (document preparation only)
  - Do not provide legal advice (separate legal review required)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 27 (MAS evidence package)
  - **Blocked By**: Task 1 (Operating Charter — entity structure reference)

  **References**:
  - MAS FinTech Regulatory Sandbox: https://www.mas.gov.sg/development/fintech/regulatory-sandbox
  - Payment Services Act 2019: https://www.mas.gov.sg/regulation/acts/payment-services-act
  - SC Ventures Libeara case: HKMA Fintech Supervisory Sandbox participation model
  - Zodia case: separate FCA/MAS/VARA registration, SC Ventures ~90% equity

  **Acceptance Criteria**:
  - [ ] ACRA registration requirements checklist completed
  - [ ] MAS sandbox application requirements analysis document
  - [ ] PSA license type decision with rationale document
  - [ ] Entity structure diagram (equity/board/regulatory structure)
  - [ ] 3+ legal/accounting partner shortlist

  **QA Scenarios**:
  ```
  Scenario: Regulatory requirements document completeness
    Tool: Bash (grep)
    Steps:
      1. Verify "ACRA", "MAS", "PSA", "sandbox" keywords exist in document
      2. Verify entity structure diagram file exists
    Expected Result: All keywords present + diagram file exists
    Evidence: .sisyphus/evidence/task-2-regulatory-checklist.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-2: docs(regulatory): MAS sandbox requirements and entity structure`

- [x] 3. Project scaffolding + monorepo + CI/CD

  **What to do**:
  - Monorepo setup (Turborepo or nx)
  - Package structure: `packages/ledger`, `packages/kya`, `packages/policy`, `packages/risk`, `packages/settlement`, `packages/compliance`, `packages/api-gateway`, `packages/messenger-bot`, `packages/dashboard`, `packages/shared-types`
  - CI/CD pipeline (GitHub Actions): lint → type-check → test → build → deploy (staging)
  - Dev environment: Docker Compose (PostgreSQL, Redis, Kafka)
  - .env.tpl + 1Password op:// reference pattern

  **Must NOT do**:
  - No production deployment configuration (staging only)
  - No plaintext secret storage (.env must use op:// references only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: All engineering tasks (4-34)
  - **Blocked By**: None

  **References**:
  - Turborepo official docs: https://turbo.build/repo/docs
  - GitHub Actions CI/CD patterns
  - 1Password CLI op:// reference pattern (per ~/.claude/CLAUDE.md global settings)

  **Acceptance Criteria**:
  - [ ] `turbo build` succeeds
  - [ ] `turbo test` succeeds (empty tests)
  - [ ] Docker Compose up: PG + Redis + Kafka all running
  - [ ] CI pipeline green
  - [ ] .env.tpl contains only op:// references

  **QA Scenarios**:
  ```
  Scenario: Monorepo build success
    Tool: Bash
    Steps:
      1. Run `turbo build`
      2. Verify exit code 0
      3. Verify each package has dist/ directory
    Expected Result: exit 0, all 10 packages built successfully
    Evidence: .sisyphus/evidence/task-3-build-success.txt

  Scenario: Docker environment startup
    Tool: Bash
    Steps:
      1. Run `docker compose up -d`
      2. Check PG, Redis, Kafka status with `docker compose ps`
      3. Verify PG connection with `pg_isready`
    Expected Result: All 3 services running
    Evidence: .sisyphus/evidence/task-3-docker-up.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-3: feat(scaffold): monorepo setup with CI/CD and dev environment`

- [x] 4. Type definitions + API schema (OpenAPI)

  **What to do**:
  - Shared type definitions (`packages/shared-types`): Agent, Account, Policy, Transaction, DecisionRecord, Capability, DisputeCase
  - OpenAPI 3.1 spec: AOA API v1 (agents, accounts, policies, payments, decisions, disputes)
  - ISO 20022 message type mapping (pain.001, pacs.008, pacs.002)
  - IVMS101 Travel Rule payload types
  - Zod schemas + TypeScript type co-generation

  **Must NOT do**:
  - No implementation logic (types/schemas only)
  - No full ISO 20022 spec implementation (only required messages)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 9-16 (all services reference types)
  - **Blocked By**: Task 3 (monorepo structure)

  **References**:
  - OpenAPI 3.1 Spec: https://spec.openapis.org/oas/latest.html
  - Zod official docs: https://zod.dev
  - ISO 20022 message definitions: pain.001/pacs.008/pacs.002
  - IVMS101 data model: InterVASP Messaging Standard
  - Decision Record schema: inputs, policy_version, model_version, reason_codes, override_actor, timestamps

  **Acceptance Criteria**:
  - [ ] `packages/shared-types` builds successfully
  - [ ] OpenAPI spec validation passes
  - [ ] Zod schema → TypeScript type auto-generation works
  - [ ] DecisionRecord type includes all required fields
  - [ ] Capability type includes action/amount/counterparty/ttl/frequency/revocable

  **QA Scenarios**:
  ```
  Scenario: Type build + OpenAPI validation
    Tool: Bash
    Steps:
      1. `bun run build --filter=shared-types` — success
      2. `npx @redocly/cli lint openapi.yaml` — success
      3. Verify DecisionRecord type has policy_version, reason_codes fields (grep)
    Expected Result: Build success + lint 0 errors + required fields present
    Evidence: .sisyphus/evidence/task-4-types-validation.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-4: feat(types): shared type definitions and OpenAPI v1 schema`

- [x] 5. Double-entry ledger core + account model

  **What to do**:
  - Double-entry ledger service: all fund movements recorded as debit/credit pairs
  - Account model: user_account, agent_account, escrow_account, fee_account
  - State machine: INITIATED → AUTHORIZED → HELD → RELEASING → SETTLED / REFUNDED / DISPUTED
  - Balance query API (real-time + point-in-time)
  - Compensating entry support (direct balance modification forbidden)
  - PostgreSQL + SERIALIZABLE isolation

  **Must NOT do**:
  - No direct balance UPDATE (always add entries)
  - No multi-currency support (Phase 1 is SGD only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Financial ledger requires strict correctness and deep reasoning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 13, 14, 18, 22
  - **Blocked By**: Task 3

  **References**:
  - Martin Fowler — Accounting Patterns
  - Stripe double-entry ledger design patterns
  - Oracle review: "ledger is source of truth, enforce strict state transitions"

  **Acceptance Criteria**:
  - [ ] Debit/credit pair entry creation auto-calculates balance
  - [ ] Concurrent transfer test passes under SERIALIZABLE isolation
  - [ ] Balance changeable only via compensating entries
  - [ ] Point-in-time balance query works
  - [ ] State machine rejects invalid transitions

  **QA Scenarios**:
  ```
  Scenario: Double-entry integrity
    Tool: Bash (bun test)
    Steps:
      1. Deposit 1,000 SGD to Account A
      2. Transfer 300 SGD from A → B
      3. Verify A balance = 700, B balance = 300
      4. Verify system-wide balance sum = 0 (debit sum = credit sum)
    Expected Result: Balances accurate + trial balance
    Evidence: .sisyphus/evidence/task-5-ledger-integrity.txt

  Scenario: Direct balance modification blocked
    Tool: Bash (bun test)
    Steps:
      1. Attempt direct UPDATE accounts SET balance = ...
      2. Verify error or trigger blocks the operation
    Expected Result: Direct modification impossible
    Evidence: .sisyphus/evidence/task-5-no-direct-update.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-5: feat(ledger): double-entry ledger core with state machine`

- [x] 6. KYA identity service (SPIFFE ID + OAuth mTLS)

  **What to do**:
  - SPIFFE ID issuance/revocation automation (agent workload identity)
  - OAuth2 mTLS (RFC 8705) token binding
  - KYA lifecycle state machine: PENDING → VERIFIED → EXPIRED → REVOKED
  - Step-up auth trigger (for high-risk actions)
  - Agent-to-Owner attribution relationship storage

  **Must NOT do**:
  - No VC/DID full implementation (Phase 2 — MVP is SPIFFE+OAuth)
  - No long-term signing key issuance to agents

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Security identity requires minimizing blast radius

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 16
  - **Blocked By**: Task 3

  **References**:
  - SPIFFE official docs: https://spiffe.io/docs/latest/spiffe-about/overview/
  - SPIFFE Concepts (SVID): https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/
  - OAuth2 mTLS RFC 8705
  - Oracle review: "agents must not hold long-term signing keys, use per-capability derived keys"

  **Acceptance Criteria**:
  - [ ] SPIFFE ID issuance → verification → revocation E2E works
  - [ ] Only mTLS-bound token requests pass through API
  - [ ] KYA state transitions (PENDING→VERIFIED→REVOKED) work
  - [ ] REVOKED agent's all requests rejected
  - [ ] Step-up auth triggers additional verification on high-risk

  **QA Scenarios**:
  ```
  Scenario: KYA lifecycle verification
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/agents — create agent (status: PENDING)
      2. POST /api/v1/agents/{id}/verify — verify (status: VERIFIED)
      3. Confirm API call succeeds in VERIFIED state
      4. POST /api/v1/agents/{id}/revoke — revoke (status: REVOKED)
      5. Confirm API call returns 403 in REVOKED state
    Expected Result: State transitions normal + access blocked when REVOKED
    Evidence: .sisyphus/evidence/task-6-kya-lifecycle.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-6: feat(kya): agent identity service with SPIFFE and mTLS`

- [x] 7. Capability token mint/revoke/verify

  **What to do**:
  - Capability token issuance API: principal, agent_id, action_set, amount_limit, counterparty_scope, ttl, max_frequency, revocable
  - Token verification middleware: check capability validity before every agent action
  - Token revocation/expiration handling
  - User consent flow (explicit consent when issuing capability)
  - Capability audit log (issuance/usage/revocation history)

  **Must NOT do**:
  - No agent actions without capability
  - No transferability violation (capabilities are non-transferable)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Oracle designated this as "launch-critical" core component

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 9, 10, 16
  - **Blocked By**: Task 6

  **References**:
  - Oracle review: "capability tokens with hard bounds: action, amount, asset/rail, counterparty, TTL, max_frequency, non-transferable, revocable, audited"
  - SPIFFE SVID-based capability binding pattern

  **Acceptance Criteria**:
  - [ ] All required fields validated on capability issuance
  - [ ] Expired capability → 403 on action attempt
  - [ ] amount_limit exceeded → blocked
  - [ ] max_frequency exceeded → blocked
  - [ ] Revoked capability immediately invalidated
  - [ ] Issuance/usage/revocation audit log stored

  **QA Scenarios**:
  ```
  Scenario: Capability limit exceeded blocking
    Tool: Bash (curl)
    Steps:
      1. Issue capability with amount_limit=1,000 SGD
      2. Execute 500 SGD payment → success
      3. Execute 600 SGD payment → blocked (remaining 500 exceeded)
    Expected Result: Second payment 403 + reason "CAPABILITY_AMOUNT_EXCEEDED"
    Evidence: .sisyphus/evidence/task-7-capability-limit.txt

  Scenario: Expired capability rejection
    Tool: Bash (curl)
    Steps:
      1. Issue capability with ttl=1s
      2. Wait 2 seconds
      3. Attempt payment execution
    Expected Result: 403 + reason "CAPABILITY_EXPIRED"
    Evidence: .sisyphus/evidence/task-7-capability-expired.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-7: feat(capability): delegation token service with hard bounds`

- [x] 8. Decision record storage + query API

  **What to do**:
  - Immutable decision record storage (append-only, no modification/deletion)
  - Schema: input_snapshot, policy_version, model_version, reason_codes, override_actor, timestamps, trace_id
  - Query API: by trace_id, by agent_id, by time_range, by outcome
  - Unified schema across Policy/Risk/Settlement/Dispute decisions
  - Retention: minimum 7 years (financial regulatory requirement)

  **Must NOT do**:
  - Absolutely no modification/deletion API for decision records
  - No immutability bypass path

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 9, 12, 18, 19
  - **Blocked By**: Task 3

  **References**:
  - Oracle review: "decision record schema spanning policy+risk+settlement+disputes; immutable storage + query"
  - "If it isn't in the decision record, it didn't happen" principle

  **Acceptance Criteria**:
  - [ ] Append-only storage (UPDATE/DELETE blocked)
  - [ ] Required field missing → storage rejected
  - [ ] trace_id lookup < 50ms
  - [ ] time_range + agent_id compound query works
  - [ ] 7-year retention policy configured

  **QA Scenarios**:
  ```
  Scenario: Immutability verification
    Tool: Bash (curl + psql)
    Steps:
      1. POST /api/v1/decisions — store record
      2. PUT /api/v1/decisions/{id} → 405
      3. DELETE /api/v1/decisions/{id} → 405
      4. Direct psql UPDATE attempt → trigger blocks
    Expected Result: All modification/deletion attempts fail
    Evidence: .sisyphus/evidence/task-8-immutability.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-8: feat(decision): immutable decision record storage and query API`

---

### Wave 2: Core Modules (Month 2-5)

- [x] 9. Policy engine (OPA/Cedar, deny-by-default)

  **What to do**:
  - OPA or Cedar-based PDP (Policy Decision Point) service
  - Deny-by-default: all actions rejected unless explicit allow policy exists
  - Pre-trade policies: amount limits, counterparty whitelist, time-of-day, action types, frequency limits
  - Policy version control + simulation/test environment
  - Shadow evaluation: parallel evaluation of new policies (measure effect before production)
  - All evaluation results → Decision Record

  **Must NOT do**:
  - No allow-by-default
  - No SpiceDB/relationship-based authorization (Phase 2)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 12, 18
  - **Blocked By**: Tasks 4, 7, 8

  **References**:
  - OPA official docs: https://www.openpolicyagent.org/docs/latest/
  - Cedar official: https://www.cedarpolicy.com/en
  - AWS Verified Permissions: https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/what-is-avp.html
  - Oracle review: "centralize PDP, deny-by-default, policy unit tests, version like code"

  **Acceptance Criteria**:
  - [ ] Action without policy → denied (deny-by-default)
  - [ ] Policy match → allowed + decision record created
  - [ ] Shadow evaluation mode works (no impact on real transactions)
  - [ ] Policy version changes preserve previous versions
  - [ ] Policy simulation API: virtual request → evaluation result returned

  **QA Scenarios**:
  ```
  Scenario: Deny-by-default verification
    Tool: Bash (curl)
    Steps:
      1. Submit payment request with no policies configured
      2. Assert response 403 + reason "NO_MATCHING_POLICY"
    Expected Result: Denied + decision record created
    Evidence: .sisyphus/evidence/task-9-deny-default.txt

  Scenario: Amount limit policy enforcement
    Tool: Bash (curl)
    Steps:
      1. Register policy "amount <= 500 SGD"
      2. Request 300 SGD → approved
      3. Request 700 SGD → denied
    Expected Result: Within limit approved, over limit denied
    Evidence: .sisyphus/evidence/task-9-amount-policy.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-9: feat(policy): OPA/Cedar policy engine with deny-by-default`

- [x] 10. Agent wallet/sub-account service

  **What to do**:
  - Per-agent sub-account CRUD API (create/query/freeze/unfreeze)
  - Purpose-bound accounts: tagged by purpose (marketing, ops, procurement)
  - Balance limits, daily/monthly spending limits
  - Master account → sub-account fund allocation/recall
  - Agent wallet ↔ ledger entry integration

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14, 18
  - **Blocked By**: Tasks 5, 7

  **Acceptance Criteria**:
  - [ ] Sub-account CRUD works
  - [ ] Balance limit exceeded → allocation rejected
  - [ ] Frozen account withdrawal attempt → blocked
  - [ ] All fund movements recorded as ledger entries
  - [ ] Purpose tagging query works

  **QA Scenarios**:
  ```
  Scenario: Sub-account fund allocation/usage
    Tool: Bash (curl)
    Steps:
      1. Master account has 10,000 SGD
      2. Create agent sub-account (limit: 2,000)
      3. Allocate 2,000 SGD → success
      4. Allocate additional 500 SGD → limit exceeded rejection
      5. Spend 1,000 SGD from sub-account → ledger entry verified
    Expected Result: Limits enforced + ledger records accurate
    Evidence: .sisyphus/evidence/task-10-subaccount.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-10: feat(wallet): agent sub-account service with purpose-bound limits`

- [x] 11. Signing service (HSM/KMS integration)

  **What to do**:
  - HSM/KMS-based signing service (AWS KMS or HashiCorp Vault Transit)
  - Key separation: custody key / transaction signing key / session key
  - Policy-gated signing: sign only when policy approved + capability valid
  - Step-up approval: multi-approval for high-risk actions (high amount, new counterparty)
  - Key rotation automation

  **Must NOT do**:
  - No long-term signing key exposure to agent runtime
  - No MPC pool implementation (Phase 2 — MVP uses KMS)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14, 18
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  - [ ] KMS key generation/signing/verification E2E works
  - [ ] Signing rejected without policy approval
  - [ ] High-risk actions require step-up
  - [ ] Existing signatures verifiable after key rotation
  - [ ] Signing logs recorded in decision record

  **QA Scenarios**:
  ```
  Scenario: Policy-gated signing
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/sign — without policy approval → 403 "POLICY_NOT_APPROVED"
      2. POST /api/v1/policies — approve signing policy for agent
      3. POST /api/v1/sign — with policy approval → 200 + signature
      4. Verify signature with public key → valid
    Expected Result: Signing blocked without policy, allowed with policy
    Evidence: .sisyphus/evidence/task-11-policy-gated-signing.txt

  Scenario: Step-up for high-value
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/sign — amount=50,000 SGD → 403 "STEP_UP_REQUIRED"
      2. POST /api/v1/sign — with step_up_token → 200 + signature
    Expected Result: High-value requires step-up
    Evidence: .sisyphus/evidence/task-11-step-up.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-11: feat(signing): HSM/KMS signing service with policy-gated operations`

- [x] 12. Pre-trade risk rules engine (top-15 rules)

  **What to do**:
  - Online risk API (synchronous, p95 < 100ms)
  - Top-15 pre-trade rules: velocity check, amount threshold, counterparty novelty, time-of-day, geo mismatch, scope deviation, rapid succession, round amount, dormant account, high-risk country, sanctioned entity, duplicate request, balance anomaly, frequency spike, cross-agent coordination
  - Rule results → risk_score + reason_codes → Decision Record
  - Human-on-the-loop queue: score > threshold → manual review queue
  - Kill-switch: instant per-rule deactivation

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 4, 8

  **Acceptance Criteria**:
  - [ ] All 15 rules implemented + individually tested
  - [ ] API p95 < 100ms
  - [ ] Threshold exceeded → HOLD + manual review queue
  - [ ] Kill-switch instantly deactivates individual rules
  - [ ] All evaluations recorded in decision record

  **QA Scenarios**:
  ```
  Scenario: Velocity check trigger
    Tool: Bash (curl + loop)
    Steps:
      1. Same agent submits 10 payment requests within 1 minute
      2. Verify HOLD status from 6th request onward
      3. Verify decision record contains "VELOCITY_EXCEEDED" reason code
    Expected Result: Threshold exceeded → HOLD + reason recorded
    Evidence: .sisyphus/evidence/task-12-velocity-check.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-12: feat(risk): pre-trade risk rules engine with 15 rules`

- [x] 13. Idempotency + outbox + saga orchestrator

  **What to do**:
  - Canonical request_id + semantic hash at ingress
  - Idempotency key store (Redis primary, PG fallback)
  - Transactional outbox: business op + event publish in single transaction
  - Saga orchestrator: multi-step settlement workflow (reserve → debit → credit → confirm)
  - Webhook receipt dedup (event_id based)
  - Reaper: clean up stuck PENDING keys

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14, 18
  - **Blocked By**: Task 5

  **Acceptance Criteria**:
  - [ ] Same idempotency key resend returns identical response
  - [ ] Outbox event publication + business op atomicity guaranteed
  - [ ] Saga mid-failure triggers compensating actions
  - [ ] Webhook duplicate receipt dedup works
  - [ ] Stuck key reaper works (60s timeout)

  **QA Scenarios**:
  ```
  Scenario: Idempotency replay
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/payments -H "Idempotency-Key: test-key-001" — 201 + payment_id
      2. POST /api/v1/payments -H "Idempotency-Key: test-key-001" (same body) — 200 + same payment_id
      3. Ledger entries count for this key = 1 (not 2)
    Expected Result: Replay returns same response, no duplicate ledger entry
    Evidence: .sisyphus/evidence/task-13-idempotency-replay.txt

  Scenario: Saga compensation on failure
    Tool: Bash (curl + docker)
    Steps:
      1. Stop settlement provider (docker stop sgd-rail)
      2. POST /api/v1/payments — saga reaches settlement step → fails
      3. Check ledger: compensating entry exists (funds returned)
      4. Check payment status: "FAILED"
      5. Restart provider, retry same idempotency key → succeeds
    Expected Result: Compensation on failure + safe retry
    Evidence: .sisyphus/evidence/task-13-saga-compensation.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-13: feat(settlement): idempotency + outbox + saga orchestration`

- [x] 14. Settlement state machine (SGD rail adapter)

  **What to do**:
  - State machine: INITIATED → AUTHORIZED → HELD → RELEASING → SETTLED / REFUNDED
  - SGD domestic transfer adapter (FAST/PayNow or sandbox simulator)
  - Provider abstraction layer: standard interface for swappable rail adapters
  - Conditional settlement (escrow): HTLC-style hash+timelock or oracle-confirm
  - Settlement confirmation → ledger entry + decision record

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 5, 10, 11, 13

  **Acceptance Criteria**:
  - [ ] State transitions only follow allowed paths
  - [ ] SGD rail adapter E2E (or sandbox simulator) works
  - [ ] Escrow hold → condition met → release → ledger update
  - [ ] Provider adapter swap requires no upstream logic change
  - [ ] All settlement decisions recorded

  **QA Scenarios**:
  ```
  Scenario: State machine valid transitions
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/payments — status=INITIATED
      2. Authorize → status=AUTHORIZED
      3. Hold (escrow) → status=HELD
      4. Release → status=RELEASING → SETTLED
      5. Attempt SETTLED → INITIATED (invalid) → 400 "INVALID_TRANSITION"
    Expected Result: Valid transitions succeed, invalid blocked
    Evidence: .sisyphus/evidence/task-14-state-machine.txt

  Scenario: Escrow conditional release
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/payments — condition_type=TIME_RELEASE, hold_expires_at=+5s
      2. Check status=HELD
      3. Wait 6 seconds
      4. GET /api/v1/payments/{id} — status=SETTLED (auto-released)
      5. Ledger entry: escrow_account → creditor transfer
    Expected Result: Time-based auto-release + ledger update
    Evidence: .sisyphus/evidence/task-14-escrow-release.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-14: feat(settlement): state machine + SGD rail adapter + escrow`

- [x] 15. Messenger bot (Telegram MVP)

  **What to do**:
  - Telegram bot: natural language command → intent parsing → AOA API call
  - Supported commands: balance query, payment execution, policy query, transaction history, agent status
  - OMO-style pipeline display: Intent Parse → Policy Check → Risk → Execute → Complete
  - Result format: amount, counterparty, status, decision_id included
  - Authentication: Telegram user_id ↔ AOA account mapping
  - HTTP webhook endpoint for testability: `POST /api/v1/telegram/webhook` accepts Telegram Update JSON

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 26 (Slack bot)
  - **Blocked By**: Tasks 4, 16

  **Acceptance Criteria**:
  - [ ] "Check balance" via Telegram → real-time balance response
  - [ ] "Pay 500 SGD from marketing agent" → E2E payment + pipeline visualization
  - [ ] Unauthenticated user request → authentication instructions
  - [ ] Policy violation → rejection reason + decision_id displayed

  **QA Scenarios**:
  ```
  Scenario: Telegram balance query
    Tool: Bash (curl — Telegram mock transport)
    Preconditions:
      - Start response mock: `npx http-echo-server --port 9997 &`
      - Set env: TELEGRAM_BOT_TOKEN=test-token, TELEGRAM_RESPONSE_URL=http://localhost:9997/tg-response
    Steps:
      1. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
           -H "Content-Type: application/json" \
           -d '{"update_id":1,"message":{"message_id":1,"from":{"id":12345},"chat":{"id":12345},"text":"check balance"}}'
      2. curl http://localhost:9997/__requests | jq '.[-1].body.text' → assert contains "SGD" and numeric amount
      3. Compare with curl GET /api/v1/accounts/{id}/balance → amounts match
      4. Kill mock: kill %1
    Expected Result: Telegram balance = API balance
    Evidence: .sisyphus/evidence/task-15-telegram-balance.txt

  Scenario: Unauthenticated user rejection
    Tool: Bash (curl — Telegram mock transport)
    Preconditions:
      - Start response mock: `npx http-echo-server --port 9997 &`
      - Set env as above
    Steps:
      1. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
           -H "Content-Type: application/json" \
           -d '{"update_id":2,"message":{"message_id":2,"from":{"id":99999},"chat":{"id":99999},"text":"check balance"}}'
         (user_id 99999 is not linked to any AOA account)
      2. curl http://localhost:9997/__requests | jq '.[-1].body.text' → assert contains authentication instructions
      3. Verify no backend API call was made:
         `docker compose logs api-gateway --since 10s 2>&1 | grep -c "POST /api/v1"` → 0
         OR if local dev: `tail -20 logs/api-gateway.log | grep -c "POST /api/v1"` → 0
      4. Kill mock: kill %1
    Expected Result: Auth prompt + zero backend API calls in gateway log
    Evidence: .sisyphus/evidence/task-15-telegram-unauth.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-15: feat(messenger): Telegram bot with OMO-style pipeline viz`

- [x] 16. AOA API gateway + auth middleware

  **What to do**:
  - API gateway: rate limiting, request validation, auth, routing
  - mTLS + Bearer token dual authentication
  - Capability verification middleware: check capability validity on every agent request
  - Request/response logging (PII masking)
  - OpenAPI-based automatic validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 15, 17
  - **Blocked By**: Tasks 4, 6, 7

  **Acceptance Criteria**:
  - [ ] Unauthenticated request → 401
  - [ ] Agent request without capability → 403
  - [ ] Rate limit exceeded → 429
  - [ ] Request body schema violation → 400
  - [ ] PII fields masked in logs

  **QA Scenarios**:
  ```
  Scenario: Auth + capability enforcement
    Tool: Bash (curl)
    Steps:
      1. curl -X POST /api/v1/payments (no auth) → 401
      2. curl -X POST /api/v1/payments -H "Authorization: Bearer valid" (no capability) → 403
      3. curl -X POST /api/v1/payments -H "Authorization: Bearer valid" -H "X-Capability: valid" → 201
    Expected Result: Layered auth enforcement
    Evidence: .sisyphus/evidence/task-16-auth-layers.txt

  Scenario: Rate limiting
    Tool: Bash (curl + loop)
    Steps:
      1. Send 100 requests in 1 second to /api/v1/payments
      2. Assert some return 429 "RATE_LIMIT_EXCEEDED"
      3. Wait 1 second, retry → 200
    Expected Result: Rate limit enforced + recovery after window
    Evidence: .sisyphus/evidence/task-16-rate-limit.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-16: feat(gateway): API gateway with capability auth middleware`

- [x] 17. Intent pipeline visualization (OMO-style)

  **What to do**:
  - Convert OMO 6-stage pipeline to financial 5-stage:
    Intent Parse → Policy Check → Risk Score → Settlement Execute → Audit Record
  - Real-time per-stage progress display (WebSocket or SSE)
  - Per-stage elapsed time display (ms)
  - Failed stage highlight + reason display
  - Shared component across Telegram/Slack/Dashboard

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 24
  - **Blocked By**: Task 16

  **Acceptance Criteria**:
  - [ ] Payment request shows 5-stage real-time progress
  - [ ] Each stage displays elapsed time (ms)
  - [ ] Policy rejection highlights stage 2 failure + reason
  - [ ] Telegram + Dashboard show identical data

  **QA Scenarios**:
  ```
  Scenario: Pipeline visualization on success
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard, trigger a payment
      2. Assert 5 stage indicators appear (selector: .pipeline-stage, count=5)
      3. Assert each stage shows time in ms (regex: /\d+ms/)
      4. Assert final stage shows "Audit Record ✓"
      5. Screenshot full pipeline
    Expected Result: 5 stages rendered with timing
    Evidence: .sisyphus/evidence/task-17-pipeline-success.png

  Scenario: Pipeline failure highlight
    Tool: Playwright
    Steps:
      1. Trigger payment that violates policy
      2. Assert stage 2 "Policy Check" shows error state (selector: .pipeline-stage.error)
      3. Assert error reason displayed (text contains reason code)
    Expected Result: Failed stage highlighted with reason
    Evidence: .sisyphus/evidence/task-17-pipeline-failure.png
  ```

  **Commit**: YES (standalone)
  - Message: `task-17: feat(ux): intent pipeline visualization with real-time stages`

---

### Wave 3: Integration + Compliance (Month 5-8)

- [x] 18. E2E settlement flow integration

  **What to do**:
  - Full pipeline integration: Intent → KYA verify → Capability check → Policy eval → Risk score → Settlement execute → Ledger update → Decision record → Audit trail
  - Cross-service transaction consistency verification
  - Failure recovery: compensating transactions on per-stage failures
  - E2E latency optimization (p95 < 500ms full pipeline)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3 entry point)
  - **Blocks**: Tasks 19, 22, 29
  - **Blocked By**: Tasks 9, 10, 12, 13, 14

  **Acceptance Criteria**:
  - [ ] Normal payment E2E < 500ms (p95)
  - [ ] Per-service failure → graceful degradation
  - [ ] All payments have decision record
  - [ ] Compensating actions verified

  **QA Scenarios**:
  ```
  Scenario: E2E normal payment pipeline
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/agents — create agent + verify
      2. POST /api/v1/capabilities — issue capability (amount_limit=1000, ttl=3600s)
      3. POST /api/v1/payments — 500 SGD payment request (Idempotency-Key: uuid)
      4. Assert response: payment_id, status="SETTLED", decision_id
      5. GET /api/v1/decisions/{decision_id} — verify policy_version, risk_score, reason_codes exist
      6. GET /api/v1/accounts/{agent_id}/balance — verify 500 SGD deducted
    Expected Result: 200 + SETTLED + complete decision record + accurate balance
    Failure Indicators: status != SETTLED, decision record fields missing, balance mismatch
    Evidence: .sisyphus/evidence/task-18-e2e-happy-path.txt

  Scenario: Mid-service failure compensation
    Tool: Bash (curl + docker)
    Steps:
      1. Stop risk service container (docker stop risk-service)
      2. POST /api/v1/payments — payment request
      3. Assert response status = "FAILED" or "HELD"
      4. Verify compensating entry exists in ledger (balance restored)
      5. Verify failure reason recorded in decision record
      6. Restart risk service, confirm normal payment works
    Expected Result: Funds safe during failure + recovery works
    Evidence: .sisyphus/evidence/task-18-failure-recovery.txt

  Scenario: Telegram cross-channel payment
    Tool: Bash (curl — Telegram mock transport)
    Preconditions:
      - Start response mock: `npx http-echo-server --port 9997 &`
      - Set env: TELEGRAM_BOT_TOKEN=test-token, TELEGRAM_RESPONSE_URL=http://localhost:9997/tg-response
    Steps:
      1. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
           -H "Content-Type: application/json" \
           -d '{"update_id":3,"message":{"message_id":3,"from":{"id":12345},"chat":{"id":12345},"text":"pay 300 SGD to marketing agent"}}'
      2. curl http://localhost:9997/__requests | jq '.[-1].body' → assert 5-stage pipeline visualization
      3. Assert final status contains "SETTLED" and "decision_id"
      4. curl GET /api/v1/decisions/{decision_id} — verify same result as Telegram response
      5. Kill mock: kill %1
    Expected Result: Telegram result = API result match
    Evidence: .sisyphus/evidence/task-18-telegram-crosschannel.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-18: feat(integration): E2E settlement pipeline integration`

- [x] 19. AML rule engine v1 (Osprey-based)

  **What to do**:
  - Osprey-based AML engine integration: CEL-Go rules, ALRT/NALT evaluation
  - FATF typology presets: Structuring, Account Takeover, Mule Activity, Rapid Movement
  - Alert workflow: ALRT → manual review queue → SAR decision
  - All evaluation results → Decision Record
  - ISO 20022 pain.001/pacs.008 message input support

  **Must NOT do**:
  - No automatic SAR submission (human review mandatory)
  - No Tazama full stack adoption (Phase 2)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 27
  - **Blocked By**: Tasks 8, 18

  **References**:
  - Osprey repo: https://github.com/opensource-finance/osprey
  - Osprey STARTER_KIT.md: FATF typology presets + configuration
  - Osprey CEL-Go rules engine: internal/rules/engine.go
  - Tazama TMS API: ISO 20022 input spec

  **Acceptance Criteria**:
  - [ ] Structuring typology detected (small split transaction pattern)
  - [ ] ALRT → case created in manual review queue
  - [ ] NALT → normal pass + decision record recorded
  - [ ] CEL rule hot-reload works
  - [ ] ISO 20022 pain.001 message parsing succeeds

  **QA Scenarios**:
  ```
  Scenario: Structuring detection
    Tool: Bash (curl)
    Steps:
      1. Same agent sends 9,000 SGD as 900 SGD × 10 split transactions within 1 hour
      2. Query AML engine evaluation result
      3. Assert status="ALRT" + typology="structuring"
      4. Verify case exists in manual review queue
    Expected Result: ALRT + structuring typology match
    Evidence: .sisyphus/evidence/task-19-structuring-detection.txt

  Scenario: Normal transaction pass
    Tool: Bash (curl)
    Steps:
      1. Single 500 SGD normal payment
      2. Assert AML evaluation status="NALT"
      3. Verify decision record contains aml.status="NALT"
    Expected Result: NALT + normal pass
    Evidence: .sisyphus/evidence/task-19-normal-pass.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-19: feat(compliance): AML rule engine v1 with Osprey integration`

- [x] 20. Travel Rule adapter interface (IVMS101)

  **What to do**:
  - IVMS101 canonical schema implementation (originator/beneficiary/amount/date)
  - Provider adapter interface: connect(), sendTravelRuleData(), verifyCounterparty()
  - Mock provider adapter (for testing)
  - Conformance test suite (required field validation, threshold validation)
  - Singapore PSA threshold applied (SGD 1,500)

  **Must NOT do**:
  - No direct integration with specific Travel Rule vendor (adapter only)
  - No PII central storage (transit only, Zero-PII-at-Rest)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 27
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] IVMS101 required field missing → validation error
  - [ ] E2E send/verify with mock provider works
  - [ ] Below-threshold transactions skip Travel Rule
  - [ ] Conformance test suite 100% pass
  - [ ] No residual PII in storage after transmission

  **QA Scenarios**:
  ```
  Scenario: Travel Rule threshold enforcement
    Tool: Bash (curl)
    Steps:
      1. 1,000 SGD transaction → Travel Rule skipped confirmed
      2. 2,000 SGD transaction → Travel Rule data sent confirmed
      3. Verify mock provider received IVMS101-compliant data
    Expected Result: Accurate threshold-based branching
    Evidence: .sisyphus/evidence/task-20-threshold.txt

  Scenario: Required field missing rejection
    Tool: Bash (curl)
    Steps:
      1. Attempt Travel Rule send with originator.name missing
      2. Assert 400 + validation error
    Expected Result: Required field missing → blocked
    Evidence: .sisyphus/evidence/task-20-validation.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-20: feat(compliance): Travel Rule adapter with IVMS101 schema`

- [x] 21. Dispute/case management service

  **What to do**:
  - Dispute intake API: case creation, reason code assignment
  - Auto-accept threshold: amount < 50 SGD → automatic refund
  - Evidence store: auto-collect transaction records, decision records, communication logs
  - SLA tracking: response deadlines, per-stage elapsed time
  - Dispute lifecycle: RECEIVED → EVIDENCE_GATHERING → SUBMITTED → RESOLVED

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 27
  - **Blocked By**: Tasks 5, 8

  **Acceptance Criteria**:
  - [ ] Dispute creation auto-attaches related transaction/decision records
  - [ ] Below auto-accept amount → automatic refund + ledger entry
  - [ ] SLA exceeded → alert generated
  - [ ] State transitions work correctly

  **QA Scenarios**:
  ```
  Scenario: Auto-accept automatic refund
    Tool: Bash (curl)
    Steps:
      1. Execute 30 SGD payment → SETTLED
      2. POST /api/v1/disputes — file dispute for that payment
      3. Assert response status="RESOLVED", resolution="AUTO_REFUND"
      4. Verify refund entry exists in ledger
    Expected Result: Instant refund + ledger record
    Evidence: .sisyphus/evidence/task-21-auto-accept.txt

  Scenario: SLA tracking
    Tool: Bash (curl)
    Steps:
      1. Create 1,000 SGD dispute (requires manual processing)
      2. GET /api/v1/disputes/{id} — verify respond_by_at field exists
      3. Verify status is EVIDENCE_GATHERING
    Expected Result: SLA deadline + correct status
    Evidence: .sisyphus/evidence/task-21-sla-tracking.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-21: feat(dispute): case management with auto-accept and SLA tracking`

- [x] 22. Reconciliation engine

  **What to do**:
  - Ledger-to-provider reconciliation: compare internal ledger vs external rail settlement results
  - Break detection: auto-identify mismatches + alert
  - Auto-correction: simple mismatches (timing differences) auto-matched
  - Manual correction queue: complex mismatches for manual review
  - Daily reconciliation report auto-generation

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 5, 18

  **Acceptance Criteria**:
  - [ ] 100 normal transactions reconciled → 0 breaks
  - [ ] Timing mismatch auto-matching works
  - [ ] Amount mismatch → alert + manual queue item created
  - [ ] Daily reconciliation report generated

  **QA Scenarios**:
  ```
  Scenario: Break detection + alert
    Tool: Bash (bun test)
    Steps:
      1. Test data: ledger shows 500 SGD, provider shows 450 SGD (50 SGD mismatch)
      2. Run reconciliation
      3. Verify break report includes this item
      4. Verify manual review queue item created
    Expected Result: Mismatch detected + queue item created
    Evidence: .sisyphus/evidence/task-22-break-detection.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-22: feat(reconciliation): ledger-to-provider reconciliation engine`

- [x] 23. Ops dashboard (real-time KPI)

  **What to do**:
  - Real-time dashboard: fraud loss bps, false decline rate, settlement success rate, reconciliation break rate, dispute win rate, AML alert rate
  - Decision record-based time-series aggregation
  - Alert configuration: Slack/email alerts when KPI exceeds threshold
  - Filters: time period, agent, policy, risk level

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 8, 18

  **Acceptance Criteria**:
  - [ ] 6 core KPIs displayed in real-time
  - [ ] Data refresh interval < 30s
  - [ ] Threshold alert works (Slack webhook)
  - [ ] Time period/agent filters work

  **QA Scenarios**:
  ```
  Scenario: KPI dashboard rendering
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard
      2. Assert 6 KPI cards exist (selector: .kpi-card, count=6)
      3. Verify settlement success rate shows numeric value (not "N/A")
      4. Capture screenshot
    Expected Result: All 6 KPIs show real-time data
    Evidence: .sisyphus/evidence/task-23-dashboard.png

  Scenario: Threshold alert
    Tool: Bash (curl + mock webhook)
    Preconditions:
      - Start Slack webhook mock: `npx http-echo-server --port 9999 &`
      - Configure alert webhook URL in .env: `SLACK_WEBHOOK_URL=http://localhost:9999/slack-alerts`
    Steps:
      1. POST /api/v1/test/inject-settlement-failures — body: {"count": 5, "consecutive": true}
      2. Wait 5 seconds for alert evaluation cycle
      3. Verify mock received alert: `curl http://localhost:9999/__requests | jq '.[-1].body'`
         → Assert body contains "settlement_success_rate" and value < 99
      4. Kill mock: `kill %1` (or `pkill -f http-echo-server`)
    Expected Result: Mock webhook received alert payload with settlement_success_rate < 99%
    Evidence: .sisyphus/evidence/task-23-alert-trigger.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-23: feat(dashboard): real-time ops KPI dashboard`

- [x] 24. Maturity ladder UX (4-stage autonomy)

  **What to do**:
  - 4-stage autonomy model UI:
    Rule-only (all actions pre-approved) → Assisted (recommendations + approval) → Bounded (auto within limits) → Portfolio (portfolio-level auto)
  - Per-enterprise current stage display + next stage requirements
  - Stage transition triggers automatic policy adjustment
  - Inspired by OMO growth model: Awakening → Flow → Context → Resonance

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 29
  - **Blocked By**: Task 17

  **Acceptance Criteria**:
  - [ ] 4-stage visualization UI renders
  - [ ] Current stage highlighted + next stage requirements shown
  - [ ] Stage transition triggers automatic policy update
  - [ ] Rule-only → Assisted transition E2E works

  **QA Scenarios**:
  ```
  Scenario: Maturity stage display and transition
    Tool: Playwright
    Steps:
      1. Navigate to /settings/maturity
      2. Assert 4 stage cards exist (selector: .maturity-stage, count=4)
      3. Verify current stage "Rule-only" is highlighted
      4. Click "Upgrade to Assisted" button
      5. Approve transition in confirmation dialog
      6. Verify auto-generated policies on policy list page
    Expected Result: Stage transition + automatic policy adjustment
    Evidence: .sisyphus/evidence/task-24-maturity-transition.png
  ```

  **Commit**: YES (standalone)
  - Message: `task-24: feat(ux): maturity ladder with 4-stage autonomy model`

- [x] 25. Privacy/audit controls + data governance

  **What to do**:
  - Data classification: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
  - PII masking: auto-mask names, account numbers, addresses in logs/dashboard
  - Audit log access control: role-based (operator, auditor, admin)
  - Data retention policy: decision records 7 years, logs 2 years, PII minimum retention
  - PDPA (Singapore Personal Data Protection Act) compliance checklist

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 27, 29
  - **Blocked By**: Task 8

  **Acceptance Criteria**:
  - [ ] PII fields masked in logs (grep finds no plaintext PII)
  - [ ] Auditor role can query decision records fully
  - [ ] Operator role sees only masked data
  - [ ] Data retention policy configured

  **QA Scenarios**:
  ```
  Scenario: PII masking verification
    Tool: Bash (grep)
    Steps:
      1. Execute payment (name="John Doe", account="1234567890")
      2. grep "John Doe" in application logs
      3. grep "1234567890" in application logs
    Expected Result: 0 plaintext PII matches (only masked versions)
    Evidence: .sisyphus/evidence/task-25-pii-masking.txt

  Scenario: Access control verification
    Tool: Bash (curl)
    Steps:
      1. GET /api/v1/decisions/{id} with Operator token → masked response
      2. GET /api/v1/decisions/{id} with Auditor token → full response
      3. Unauthenticated request → 401
    Expected Result: Role-based data visibility separation
    Evidence: .sisyphus/evidence/task-25-access-control.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-25: feat(privacy): PII masking, access control, and data governance`

- [x] 26. Slack bot integration

  **What to do**:
  - Slack bot: same features as Telegram bot (balance, payment, policy, history, pipeline visualization)
  - Slack-specific UX: Block Kit usage, interactive buttons
  - Slack workspace ↔ AOA account mapping
  - Authentication: Slack OAuth2 + AOA account linking

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 29
  - **Blocked By**: Task 15

  **Acceptance Criteria**:
  - [ ] "/aoa balance" in Slack → balance response
  - [ ] Payment request in Slack → pipeline visualization + result
  - [ ] Unlinked workspace request → linking instructions
  - [ ] Block Kit interactive buttons work

  **QA Scenarios**:
  ```
  Scenario: Slack payment execution
    Tool: Bash (curl — Slack API mock)
    Preconditions:
      - Start Slack interaction mock: `npx http-echo-server --port 9998 &`
      - Set env: `SLACK_BOT_TOKEN=xoxb-test-token`, `SLACK_SIGNING_SECRET=test-secret`
      - Configure bot to post responses to: `http://localhost:9998/slack-response`
    Steps:
      1. Simulate slash command via curl:
         `curl -X POST http://localhost:3000/api/v1/slack/commands \
           -H "Content-Type: application/x-www-form-urlencoded" \
           -d "command=/aoa&text=pay 200 SGD to vendor-A&user_id=U_TEST&channel_id=C_TEST&response_url=http://localhost:9998/slack-response"`
      2. Check mock for Block Kit response:
         `curl http://localhost:9998/__requests | jq '.[-1].body.blocks | length'` → >= 5 (pipeline stages)
      3. Wait for settlement (max 10s), re-check mock:
         `curl http://localhost:9998/__requests | jq '.[-1].body.blocks[-1].text.text'`
         → Assert contains "SETTLED" and "decision_id"
      4. Kill mock: `kill %1`
    Expected Result: Slash command triggers payment, mock receives Block Kit response with 5 pipeline stages and final SETTLED status
    Evidence: .sisyphus/evidence/task-26-slack-payment.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-26: feat(messenger): Slack bot with Block Kit integration`

### Wave 4: Launch + Scale (Month 8-12)

- [x] 27. MAS sandbox evidence package

  **What to do**:
  - MAS FinTech Regulatory Sandbox application draft
  - Evidence documents: AML control evidence, KYA process, audit trail samples, risk management framework
  - Control matrix: per-control implementation status/evidence file mapping
  - Test results package: QA scenario execution evidence collection

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1
  - **Blocked By**: Tasks 2, 19, 20, 21, 25

  **Acceptance Criteria**:
  - [ ] MAS application draft completed (all required sections)
  - [ ] Control matrix maps all control items
  - [ ] Evidence file list + file paths organized
  - [ ] AML/KYA/audit each has minimum 3 evidence items

  **QA Scenarios**:
  ```
  Scenario: Evidence package completeness
    Tool: Bash (find + wc)
    Steps:
      1. Count documents in docs/regulatory/ directory
      2. Count "IMPLEMENTED" status items in control matrix
      3. Verify evidence file path exists for each control item
    Expected Result: Minimum 15 documents + all controls mapped
    Evidence: .sisyphus/evidence/task-27-regulatory-package.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-27: docs(regulatory): MAS sandbox application evidence package`

- [x] 28. Security audit + penetration test

  **What to do**:
  - Dependency audit: `npm audit` / `bun audit` — 0 critical known vulnerabilities
  - Secret detection: gitleaks/trufflehog scan
  - OWASP Top 10 checklist (API security)
  - Penetration test scenarios: auth bypass, privilege escalation, injection, IDOR
  - Security report + findings remediation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 29
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] 0 critical/high vulnerabilities
  - [ ] 0 secret detection positives
  - [ ] OWASP Top 10 checklist 100% pass
  - [ ] All 4 penetration test scenarios defended
  - [ ] Security report completed

  **QA Scenarios**:
  ```
  Scenario: Auth bypass defense
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/payments without authentication
      2. Assert 401
      3. Request with another agent's capability token
      4. Assert 403 (cross-agent access blocked)
    Expected Result: Unauthenticated 401, cross-agent 403
    Evidence: .sisyphus/evidence/task-28-auth-bypass.txt

  Scenario: Secret detection
    Tool: Bash (gitleaks)
    Steps:
      1. Run `gitleaks detect --source . --verbose`
      2. Assert 0 findings
    Expected Result: 0 secrets detected
    Evidence: .sisyphus/evidence/task-28-secret-scan.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-28: security: audit results and vulnerability remediation`

- [x] 29. Pilot customer onboarding (3 accounts)

  **What to do**:
  - Select 3 pilot customers from SC Ventures network (SCV responsibility)
  - Per-customer AOA account setup: master account + agent sub-accounts
  - Policy template provision + customization support
  - Onboarding guide + API documentation provision
  - 14-day pilot period + feedback collection

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 4 final)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 18, 22, 23, 24, 26, 28

  **Acceptance Criteria**:
  - [ ] 3 customer accounts created + agents activated
  - [ ] Each customer completes minimum 1 live transaction
  - [ ] Onboarding guide document provided
  - [ ] Pilot feedback collected (NPS or CSAT)
  - [ ] LOI or continued usage intent confirmed

  **QA Scenarios**:
  ```
  Scenario: Pilot customer E2E workflow
    Tool: Bash (curl)
    Steps:
      1. Customer A account: create agent → issue capability → execute payment
      2. Verify settlement completed
      3. Verify decision record queryable
      4. Verify Customer A's KPIs displayed on dashboard
    Expected Result: Full workflow normal
    Evidence: .sisyphus/evidence/task-29-pilot-e2e.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-29: feat(launch): pilot customer onboarding and go-live`

- [x] 30. Load/stress testing + SLO tuning

  **What to do**:
  - Load testing: 100 concurrent agents, 1,000 TPS target
  - SLO definition + tuning: API p95 < 200ms, settlement p95 < 500ms, uptime > 99.9%
  - Fault injection (chaos engineering): DB latency, network partition, service crash
  - Bottleneck identification + optimization
  - SLO dashboard setup

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 29
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] API p95 < 200ms at 1,000 TPS
  - [ ] Settlement p95 < 500ms
  - [ ] DB latency injection → graceful degradation
  - [ ] SLO dashboard real-time tracking

  **QA Scenarios**:
  ```
  Scenario: Load testing
    Tool: Bash (k6 or wrk)
    Steps:
      1. k6 script: 100 VUs, 60s duration, POST /api/v1/payments
      2. Check p95 latency
      3. Check error rate
    Expected Result: p95 < 200ms, error rate < 0.1%
    Evidence: .sisyphus/evidence/task-30-load-test.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-30: test(perf): load testing and SLO tuning results`

- [x] 31. Model risk governance framework

  **What to do**:
  - Model registry: registration, versioning, approval status, owner
  - Version pinning: production model version fixed + change approval workflow
  - Canary/shadow deployment: new model → 10% traffic → full comparison
  - Kill-switch: instant per-model deactivation
  - Monitoring: drift/PSI, accuracy, override rate

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27
  - **Blocked By**: Tasks 8, 12

  **Acceptance Criteria**:
  - [ ] Model registry CRUD works
  - [ ] Unapproved model blocked from production deployment
  - [ ] Kill-switch activation → immediate fallback
  - [ ] Shadow mode: comparison evaluation without affecting live transactions

  **QA Scenarios**:
  ```
  Scenario: Kill-switch operation
    Tool: Bash (curl)
    Steps:
      1. Risk model v1 active state: payment → risk_score returned
      2. PUT /api/v1/models/risk-v1/kill — activate kill-switch
      3. Payment request → fallback rule-only mode confirmed
      4. Decision record contains "MODEL_KILLED_FALLBACK" reason code
    Expected Result: Kill-switch immediate effect + fallback normal
    Evidence: .sisyphus/evidence/task-31-kill-switch.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-31: feat(risk): model risk governance with registry and kill-switch`

- [x] 32. Landing page + GTM materials

  **What to do**:
  - OMO-style landing page:
    Hero: "Your agents need a bank account" / pipeline demo
    Trust: Bank-grade security + MAS sandbox + SC Ventures backed
    Features: 7-layer visualization + Telegram/Slack demo
    Pricing: Free + Token-based
    CTA: "Start your pilot"
  - GTM materials: 1-pager, 2-page datasheet, API quickstart guide

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 29
  - **Blocked By**: None (independent)

  **Acceptance Criteria**:
  - [ ] Landing page renders + mobile responsive
  - [ ] Pipeline demo interaction works
  - [ ] CTA button → pilot application form
  - [ ] 3 GTM materials completed

  **QA Scenarios**:
  ```
  Scenario: Landing page rendering
    Tool: Playwright
    Steps:
      1. Navigate to /
      2. Verify hero section text (selector: .hero-title)
      3. Verify trust signals section exists (selector: .trust-signals)
      4. Click CTA button → verify navigation to form page
      5. Screenshot at mobile viewport (375px)
    Expected Result: Desktop/mobile both render correctly
    Evidence: .sisyphus/evidence/task-32-landing-desktop.png
    Evidence: .sisyphus/evidence/task-32-landing-mobile.png
  ```

  **Commit**: YES (standalone)
  - Message: `task-32: feat(gtm): landing page and marketing materials`

- [x] 33. Incident playbook + runbook

  **What to do**:
  - Incident response runbook: severity classification (SEV1-SEV3), response procedures, escalation paths
  - Per-service runbooks: diagnosis/recovery procedures for each service failure
  - On-call rotation setup
  - Postmortem template
  - SCV escalation matrix (SEV1 → SCV Venture Lead notified within 30 min)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 29
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] SEV1-SEV3 classification criteria defined
  - [ ] Minimum 1 runbook per service
  - [ ] Escalation matrix (time-based)
  - [ ] Postmortem template written

  **QA Scenarios**:
  ```
  Scenario: Runbook completeness
    Tool: Bash (grep + wc)
    Steps:
      1. Count files in docs/runbooks/ directory
      2. Verify each runbook has "Diagnosis", "Recovery", "Escalation" sections
    Expected Result: Minimum 7 runbooks + required sections present
    Evidence: .sisyphus/evidence/task-33-runbook-completeness.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-33: docs(ops): incident playbooks and runbooks`

- [x] 34. Commercial pricing engine (free + token)

  **What to do**:
  - Free tier: basic AOA account + 100 transactions/month
  - Token-based billing: additional transactions, premium risk models, premium AML
  - Usage tracking: transaction count, decision count, API call count
  - Billing API: usage query, invoice generation
  - Price page: OMO-style Free / Pro comparison table

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 5, 10

  **Acceptance Criteria**:
  - [ ] Free tier exceeds 100 → billing transition alert
  - [ ] Usage API accuracy (matches ledger)
  - [ ] Automatic invoice generation works
  - [ ] Price page renders

  **QA Scenarios**:
  ```
  Scenario: Free tier limit exceeded
    Tool: Bash (curl + loop)
    Steps:
      1. Submit 101 payment requests with free tier account
      2. Assert 101st request returns "FREE_TIER_EXCEEDED" response
      3. Verify upgrade instructions included
    Expected Result: Limit exceeded detected + upgrade instructions
    Evidence: .sisyphus/evidence/task-34-free-tier-limit.txt
  ```

  **Commit**: YES (standalone)
  - Message: `task-34: feat(billing): pricing engine with free tier and token-based billing`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  - Read the plan end-to-end
  - For each "Must Have" (7 items): verify implementation exists via file read + grep
  - For each "Must NOT Have" (6 items): search codebase for forbidden patterns
  - Check evidence files exist in .sisyphus/evidence/
  - Verify human-dependent artifacts exist (LOI PDFs, MAS docs, pentest report)

  **QA Scenarios**:
  ```
  Scenario: Must Have verification
    Tool: Bash (grep + read)
    Steps:
      1. grep -r "CapabilityToken" packages/ — capability delegation exists
      2. grep -r "DecisionRecord" packages/ — decision record plane exists
      3. grep -r "deny.*default\|DENY_BY_DEFAULT" packages/policy/ — deny-by-default
      4. grep -r "double.entry\|DoubleEntry\|debit.*credit" packages/ledger/ — double-entry ledger
      5. grep -r "KMS\|HSM\|SigningService" packages/ — key separation
      6. grep -r "idempotency\|IdempotencyKey" packages/ — E2E idempotency
      7. grep -r "AML\|TravelRule\|IVMS" packages/compliance/ — AML + Travel Rule
    Expected Result: All 7 Must Haves found with implementation files
    Evidence: .sisyphus/evidence/task-f1-musthave-audit.txt

  Scenario: Must NOT Have verification
    Tool: Bash (grep)
    Steps:
      1. grep -r "SpiceDB\|spicedb" packages/ — should return 0 results
      2. grep -r "graph.*risk\|GraphRisk" packages/ — should return 0 results
      3. grep -r "MPC\|multi.party.computation" packages/ — should return 0 results
      4. Check no multi-currency support beyond SGD
    Expected Result: All 6 forbidden patterns absent
    Evidence: .sisyphus/evidence/task-f1-mustnothave-audit.txt

  Scenario: Evidence files completeness
    Tool: Bash (find + wc)
    Steps:
      1. find .sisyphus/evidence/ -name "task-*" | wc -l
      2. Verify count >= 34 (one per task minimum)
      3. Check human-gate artifacts: ls docs/legal/LOI-*.pdf, docs/regulatory/mas-*.pdf
    Expected Result: >= 34 evidence files + human-gate artifacts present
    Evidence: .sisyphus/evidence/task-f1-evidence-completeness.txt
  ```

  Output: `Must Have [N/7] | Must NOT Have [N/6] | Evidence [N/34+] | Human Gates [N/3] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality + Security Review** — `unspecified-high`

  **What to do**:
  - Run build, lint, test, security scanning
  - Review code for AI slop patterns
  - Verify no secrets in codebase

  **QA Scenarios**:
  ```
  Scenario: Build + Lint + Test pipeline
    Tool: Bash
    Steps:
      1. `turbo build` — exit 0
      2. `turbo lint` — exit 0
      3. `bun test --coverage` — all pass, coverage > 90%
      4. `npx tsc --noEmit` — 0 errors
    Expected Result: All 4 commands exit 0
    Evidence: .sisyphus/evidence/task-f2-build-lint-test.txt

  Scenario: Security scanning
    Tool: Bash
    Steps:
      1. `bun audit` or `npm audit` — 0 critical/high
      2. `gitleaks detect --source .` — 0 findings
      3. grep -rn "as any\|@ts-ignore\|TODO.*hack\|FIXME.*security" packages/ — flag count
    Expected Result: 0 critical vulns, 0 secrets, minimal code smells
    Evidence: .sisyphus/evidence/task-f2-security-scan.txt
  ```

  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail, coverage%] | Security [PASS/FAIL] | VERDICT`

- [x] F3. **E2E Customer Journey QA** — `unspecified-high` + `playwright` skill

  **What to do**:
  - Execute full AOA customer lifecycle from clean state
  - Test via API, Telegram, and Dashboard

  **QA Scenarios**:
  ```
  Scenario: Full AOA lifecycle via API
    Tool: Bash (curl)
    Steps:
      1. POST /api/v1/agents — create agent, assert 201 + agent_id
      2. POST /api/v1/capabilities — mint capability, assert 201 + capability_id
      3. POST /api/v1/policies — set deny-by-default + allow 500 SGD, assert 201
      4. POST /api/v1/payments — 300 SGD payment, assert 201 + status="SETTLED"
      5. GET /api/v1/decisions/{decision_id} — assert policy_version + risk_score + reason_codes
      6. GET /api/v1/accounts/{agent_id}/balance — assert 700 SGD remaining
      7. POST /api/v1/disputes — file dispute on payment, assert 201
      8. GET /api/v1/disputes/{id} — assert status + evidence attached
    Expected Result: 8-step lifecycle completes without error
    Evidence: .sisyphus/evidence/task-f3-api-lifecycle.txt

  Scenario: Dashboard KPI verification
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard
      2. Assert 6 KPI cards visible (selector: .kpi-card, count >= 6)
      3. Assert settlement success rate shows numeric value (not "N/A")
      4. Navigate to /decisions — assert decision records listed
      5. Screenshot full dashboard
    Expected Result: Dashboard renders with live data from lifecycle test
    Evidence: .sisyphus/evidence/task-f3-dashboard.png

  Scenario: Telegram cross-channel verification
    Tool: Bash (curl — Telegram mock transport)
    Preconditions:
      - Start response mock: `npx http-echo-server --port 9997 &`
      - Set env: TELEGRAM_BOT_TOKEN=test-token, TELEGRAM_RESPONSE_URL=http://localhost:9997/tg-response
    Steps:
      1. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
           -H "Content-Type: application/json" \
           -d '{"update_id":10,"message":{"message_id":10,"from":{"id":12345},"chat":{"id":12345},"text":"balance"}}'
      2. curl http://localhost:9997/__requests | jq '.[-1].body.text' → assert contains SGD amount
      3. curl -X POST http://localhost:3000/api/v1/telegram/webhook \
           -H "Content-Type: application/json" \
           -d '{"update_id":11,"message":{"message_id":11,"from":{"id":12345},"chat":{"id":12345},"text":"pay 100 SGD to test-vendor"}}'
      4. curl http://localhost:9997/__requests | jq '.[-1].body' → assert pipeline visualization (5 stages)
      5. Assert final SETTLED status with decision_id
      6. Kill mock: kill %1
    Expected Result: Telegram delivers same results as API
    Evidence: .sisyphus/evidence/task-f3-telegram.txt
  ```

  Output: `API Lifecycle [8/8] | Dashboard [PASS/FAIL] | Telegram [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  - For each of 34 tasks: compare spec vs actual implementation
  - Check "Must NOT do" compliance per task
  - Detect cross-task contamination

  **QA Scenarios**:
  ```
  Scenario: Spec-to-implementation alignment
    Tool: Bash (git log + grep + read)
    Steps:
      1. For each task N (1-34):
         a. Read task spec from plan (grep "- \[ \] {N}\." plan file)
         b. Read commit message matching task (git log --grep="task-{N}:")
         c. List files changed in commit (git show --name-only {hash})
         d. Verify changed files match task scope (no files outside task boundary)
      2. Count: tasks where all files match scope / total tasks
      NOTE: All commit messages use "task-N:" prefix for reliable matching
    Expected Result: 34/34 tasks scope-compliant
    Evidence: .sisyphus/evidence/task-f4-scope-alignment.txt

  Scenario: Cross-task contamination check
    Tool: Bash (git log)
    Steps:
      1. For each commit, list files changed
      2. Cross-reference: does any commit touch files belonging to another task?
      3. Flag any file modified by 2+ task commits (outside shared-types)
    Expected Result: 0 contamination events (shared-types excluded)
    Evidence: .sisyphus/evidence/task-f4-contamination.txt

  Scenario: Must NOT do compliance
    Tool: Bash (grep)
    Steps:
      1. grep -r "SpiceDB" — 0 results
      2. grep -r "allow.*default\|ALLOW_BY_DEFAULT" packages/policy/ — 0 results
      3. Check no multi-currency (grep -r "USD\|EUR\|JPY" packages/ excluding docs/)
      4. Check no auto-deploy model (grep -r "auto.deploy\|AUTO_DEPLOY" packages/)
    Expected Result: All forbidden patterns absent
    Evidence: .sisyphus/evidence/task-f4-mustnot-compliance.txt
  ```

  Output: `Tasks [N/34 compliant] | Contamination [CLEAN/N issues] | Must-NOT [6/6 clean] | VERDICT`

---

## Commit Strategy

> **Every task produces exactly one atomic commit** with the `task-N:` prefix pattern.
> This enables reliable `git log --grep="task-{N}:"` matching for F4 scope fidelity checks.
> No wave-level rollup commits. Tags may be used for wave milestones if desired.

| Wave | Tasks | Commit Pattern |
|------|-------|---------------|
| 1 | T1-T8 | `task-1:` through `task-8:` (8 atomic commits) |
| 2 | T9-T17 | `task-9:` through `task-17:` (9 atomic commits) |
| 3 | T18-T26 | `task-18:` through `task-26:` (9 atomic commits) |
| 4 | T27-T34 | `task-27:` through `task-34:` (8 atomic commits) |

---

## Success Criteria

### Verification Commands
```bash
bun test --coverage  # Expected: >90% coverage, 0 failures
curl -X POST /api/v1/agents -d '...'  # Expected: 201 + agent_id
curl -X POST /api/v1/payments -H 'Idempotency-Key: ...'  # Expected: 201 + settlement confirmation
curl /api/v1/decisions/{id}  # Expected: 200 + immutable decision record
```

### Final Checklist
- [x] All "Must Have" present (7/7)
- [x] All "Must NOT Have" absent (6/6)
- [x] Settlement success > 99.95%
- [x] Decision latency p95 < 200ms
- [x] Reconciliation break rate < 0.1%
- [ ] 3 pilot customer LOIs  ← human gate
- [ ] MAS sandbox application submitted  ← human gate
- [x] All tests pass
