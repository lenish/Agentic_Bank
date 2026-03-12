# Learnings — agentic-bank-pan-asia

## [2026-03-12] Session Init
- Greenfield project — no existing codebase
- Git repo initialized at /Users/ryan/Projects/Agentic_Bank
- Worktree = project root (no separate worktree needed for greenfield)
- Plan: 34 tasks + 4 Final Wave tasks, Wave 1 = 8 tasks (T1-T8)
- Wave 1 parallelization: T1+T3 first (no dependencies), then T4+T5+T6+T8 (after T3), T2 (after T1), T7 (after T6)
- All docs go in docs/ subdirectory
- Engineering packages go in packages/ (monorepo structure per T3)
- Evidence files go in .sisyphus/evidence/task-{N}-{slug}.{ext}
## Task 1: Operating Charter
- Drafted the Operating Charter for SC Ventures partnership.
- Defined DRI roles (SCV Venture Lead, Delivery Lead).
- Established Reserved Matters (capex, regulatory, brand, equity, pivots).
- Mapped KPI ownership between SCV and Execution Team.
- Defined escalation triggers and governance cadence (Weekly/Bi-weekly/Monthly/Quarterly).
- Incorporated Zodia archetype and SCV stage-gate model.
- Included non-negotiable product requirements: Capability Delegation, Decision Record Plane, Provider Adapters.

## [2026-03-12] Task 3: Monorepo Scaffold
- Bun binary at ~/.bun/bin/bun — not in default PATH; need `export PATH="$HOME/.bun/bin:$PATH"`
- Turborepo v2.8.16 works with bun workspaces out of the box
- `bun build src/index.ts --outdir dist --target bun && tsc --emitDeclarationOnly` is the build pattern: bun for JS output, tsc for .d.ts only
- 10 packages: shared-types, ledger, kya, policy, risk, settlement, compliance, api-gateway, messenger-bot, dashboard — all @aoa/ scoped
- Docker Compose: postgres:16 (POSTGRES_DB=aoa_dev), redis:7-alpine, redpanda (Kafka-compatible at port 19092)
- .env.tpl uses op:// references exclusively — verified with grep
- turbo.json `test` task has `"cache": false` — tests should always run fresh
- CI pipeline: checkout → setup-bun → bun install --frozen-lockfile → lint → typecheck → test → build
- bun-types devDep needed in each package for Bun API types (bun:test, etc.)

## [2026-03-12] Task 6: KYA Identity Service (SPIFFE + OAuth mTLS trigger)
- Implemented `@aoa/kya` MVP identity stack using short-lived JWT SVIDs (HS256) with claims: `sub`, `spiffe_id`, `owner_id`, `iat`, `exp`.
- SPIFFE ID canonical format fixed as `spiffe://aoa.local/agent/{agentId}` and validated during verify.
- Added in-memory store for agent-owner attribution (`Map<agentId, { ownerId, attributedAt }>`), revocation set, and lifecycle state map.
- KYA lifecycle state machine implemented with strict transitions: `PENDING -> VERIFIED/EXPIRED/REVOKED`, `VERIFIED -> EXPIRED/REVOKED`, `EXPIRED -> REVOKED`, `REVOKED -> blocked`.
- Revocation is permanent at identity layer: revoked agents cannot receive new SVID and existing SVID verification fails.
- Step-up policy in KYA now triggers on amount `> 10_000_00` (SGD cents), first-time counterparty, or explicit high-risk actions; enforcement remains upstream.

## [2026-03-12] Task 4: Type Definitions + OpenAPI Schema
- Created 8 type definition files in packages/shared-types/src/types/:
  - agent.ts: Agent, AgentStatus (ACTIVE/INACTIVE/SUSPENDED/REVOKED), KYAStatus (PENDING/VERIFIED/REJECTED/EXPIRED)
  - account.ts: Account, AccountType (OPERATING/SETTLEMENT/ESCROW/RESERVE), AccountStatus (ACTIVE/FROZEN/CLOSED/SUSPENDED)
  - capability.ts: Capability with 7 bounds (action[], amount_limit_sgd_cents, counterparty_scope[], ttl_seconds, max_frequency_per_hour, revocable, non_transferable=true)
  - policy.ts: Policy, PolicyRule, PolicyVersion (versioned policy system)
  - transaction.ts: Transaction with 7 states (INITIATED, AUTHORIZED, HELD, RELEASING, SETTLED, REFUNDED, DISPUTED)
  - decision-record.ts: DecisionRecord with launch-critical fields (input_snapshot, policy_version, model_version, reason_codes[], override_actor?, trace_id, created_at, outcome)
  - dispute.ts: DisputeCase, DisputeStatus (OPEN/UNDER_REVIEW/RESOLVED/CLOSED/ESCALATED)
  - travel-rule.ts: IVMS101Payload, Pain001Message, Pacs008Message, Pacs002Message (minimal ISO 20022 stubs for Phase 1)
- All types have matching Zod schemas with proper validation
- All amounts in SGD cents (integer) to avoid floating point precision issues
- OpenAPI 3.1 spec (openapi.yaml) covers 6 endpoint groups: agents, accounts, capabilities, payments, decisions, disputes
- Build: `bun run build --filter=@aoa/shared-types` passes (127.36 KB bundled)
- OpenAPI validation: `npx @redocly/cli lint openapi.yaml` passes (1 warning about localhost is acceptable)
- TypeScript isolatedModules requires `export type` for type-only re-exports in index.ts
- Zod schema pattern: export both schema (z.ZodType) and inferred type (z.infer<typeof Schema>)

## [2026-03-12] Task 5: Ledger Core + Account Model
- Implemented `@aoa/ledger` with append-only double-entry model: each transfer posts exactly two rows (`-amount`, `+amount`) and validates net zero per transaction.
- Added immutable ledger schema SQL (`ledgerSchemaSql`) including `accounts`, `ledger_entries`, SGD currency check, and trigger to block UPDATE/DELETE for compensating-entry-only correction flow.
- Implemented in-memory fallback store (`InMemoryLedgerStore`) with serialized write queue to emulate SERIALIZABLE transaction behavior when PostgreSQL is unavailable.
- Added `AccountService` with account types (`user_account`, `agent_account`, `escrow_account`, `fee_account`) and freeze/unfreeze controls; frozen accounts are blocked from posting entries.
- Added `LedgerService` APIs: `createEntry`, `getBalance`, `getBalanceAt`, `createCompensatingEntry`, `getTrialBalance`; all amounts validated as positive integer SGD cents.
- Added pure `TransactionStateMachine` with explicit allowed transitions and typed `InvalidStateTransitionError` for invalid moves.
- Test coverage includes balanced pair invariant, transfer balances + trial balance, direct update guard, concurrent transfer consistency, state-machine valid/invalid transitions, historical balance query, and compensating-entry reversal.

## [2026-03-12] Task 8: Immutable Decision Record Storage + Query API
- Implemented `@aoa/compliance` DecisionRecordService with append-only semantics: NO update/delete/remove/modify/patch methods at service or store layer.
- Immutability enforced at 3 levels: (1) TypeScript `readonly` on all DecisionRecord fields, (2) `Object.freeze()` in store, (3) defensive copy of input arrays/objects.
- Compliance schema diverges from `@aoa/shared-types` DecisionRecord: uses `HELD` (not `ESCALATED`), adds `metadata: Record<string, unknown>`, and uses `policy_version: string` (semver) instead of `number`.
- DecisionRecordInput separates user-provided fields from auto-generated ones (id, created_at).
- Multiple records per trace_id are allowed — policy + risk engines both append for the same transaction.
- In-memory store uses `Map<id, DecisionRecord>` with write-once guard (throws on duplicate id).
- Time-range filtering via `DecisionQueryOptions { from?: Date; to?: Date }` applied in getByAgentId and getByOutcome.
- MAS retention comment added: "7 years per MAS financial record requirements".
- TODO for production: PostgreSQL with INSERT-only row-level security.
- TypeScript strict mode: `as unknown as Record<string, unknown>` double-cast needed for runtime method-existence checks on class instances.

## [2026-03-12] Task 2: Entity Incorporation + MAS Sandbox Preparation
- PSA license decision: **SPI (Standard Payment Institution)** for Phase 1 — monthly volume well below S$3M, daily float well below S$5M, S$100K base capital vs S$250K MPI. Upgrade to MPI when volumes approach ~S$2M/month.
- PSA 2019 relevant service categories for Phase 1: domestic money transfer service + account issuance service. E-money issuance may apply (evaluate if AOA balances = e-money).
- ACRA incorporation: 3-6 weeks total. Name reservation (1-2 days), document prep (1-2 weeks), filing (same-day), post-incorporation (2-4 weeks).
- Must have ≥1 Singapore-resident director (citizen, PR, or EP holder). Company secretary within 6 months.
- Entity structure: AoaBank Pte. Ltd. — SCV ~90% equity, Execution Team ~10% ESOP. Separate balance sheet, own MAS license, independent board. Zodia archetype.
- MAS sandbox timeline: ~24-28 months end-to-end (entity incorporation → sandbox application → 12-month sandbox → SPI license).
- MAS pre-application consultation strongly recommended — shortens review cycle per precedent.
- Legal partners shortlisted: Allen & Gledhill (gold standard MAS), Rajah & Tann (pan-Asian network for Phase 2+), WongPartnership (bank-spinout structuring), Simmons & Simmons (multi-jurisdiction).
- Accounting: KPMG (MAS advisory strength), PwC (transfer pricing for SCV intercompany), Deloitte (comprehensive offering).
- Year 1 professional fees estimate: S$128K-S$251K (~US$96K-US$188K).
- MAS sandbox restrictions to expect: customer cap (50-200), transaction limits, geographic restriction (SG only), monthly reporting, fund safeguarding required even in sandbox.
- AOA-specific MAS conditions anticipated: agent authorization audit trail, capability delegation bounds, human override mechanism, KYA requirements, explainability.

## [2026-03-12] Task 7: Capability token mint/revoke/verify
- Added `CapabilityTokenService` in `packages/kya/src/capability.ts` using Map-based in-memory stores for capability objects, cumulative amount usage, and rolling one-hour frequency timestamps.
- Enforced all hard bounds at issuance/verification: `action_set`, `amount_limit_sgd_cents`, `counterparty_scope`, `ttl_seconds`, `max_frequency_per_hour`, `non_transferable=true`, and `revocable`.
- Capability tokens are plain objects (no JWT); IDs are generated via `crypto.randomUUID()` and revocation is immediate with `CAPABILITY_REVOKED` on subsequent verify calls.
- Expiry enforcement follows `issued_at + ttl_seconds * 1000 < Date.now()` and emits append-only audit events (`ISSUED`, `USED`, `REVOKED`, `EXPIRED`).
- Added 10 `bun:test` cases in `packages/kya/src/capability.test.ts` including QA scenarios for amount-limit overflow and 1-second TTL expiry behavior.

## [2026-03-12] Task 9: Policy Engine (deny-by-default PDP)
- Implemented  PDP with deny-by-default behavior: no current policy or no matching rule returns .
- Added pre-trade rule support in engine: , ,  (including overnight ranges), , and .
- Policy versions use semver strings and are immutable in store once inserted; previous versions are preserved and selectable for simulation.
- Added simulation/shadow paths with zero side effects on live frequency counters by evaluating candidate versions with .
- In-memory policy store follows Phase 1 pattern () and includes TODO marker for PostgreSQL migration.

## [2026-03-12] Task 9: Policy Engine (deny-by-default PDP)
- Implemented @aoa/policy PDP with deny-by-default behavior: no current policy or no matching rule returns NO_MATCHING_POLICY.
- Added pre-trade rule support in engine: amount_limit, counterparty_whitelist, time_of_day (including overnight ranges), action_types, and frequency_limit.
- Policy versions use semver strings and are immutable in store once inserted; previous versions are preserved and selectable for simulation.
- Added simulation and shadow paths with zero side effects on live frequency counters by evaluating candidate versions with track_usage=false.
- In-memory policy store follows Phase 1 pattern (Map) and includes TODO marker for PostgreSQL migration.

- Correction: the earlier Task 9 bullet block at lines 100-105 was shell-interpolation-corrupted; canonical Task 9 notes are lines 107-112.

## [2026-03-12] Task 10 — Agent Wallet/Sub-Account Service
- AgentWalletService wraps AccountService + LedgerService + InMemoryLedgerStore (3 deps injected via constructor).
- SubAccountRecord is pure metadata (accountId, agentId, masterAccountId, purpose, limitSgdCents); frozen status delegates to AccountRecord via store.getAccount().
- Balance limit enforcement: check ledgerService.getBalance() before createEntry in allocateFunds. Not atomic with ledger write in Phase 1 (TODO for PostgreSQL serializable tx).
- Frozen checks use assertNotFrozen() for early rejection with specific error ("Sub-account is frozen") before delegating to LedgerService which also rejects frozen accounts generically.
- All fund movements use metadata tagging: { type: "allocation"|"recall"|"spend", purpose: string }.
- 10 tests written (exceeds 8 minimum). QA scenario covers full lifecycle: fund master → create sub → allocate → over-limit reject → spend → verify trial balance = 0.

## [2026-03-12] Task 11 — Settlement Signing Service
- Ed25519 signing in Bun uses Node crypto APIs directly: `generateKeyPairSync("ed25519")`, `sign(null, payloadBuffer, privateKey)`, `verify(null, payloadBuffer, publicKey, signatureBuffer)`.
- Step-up threshold is reused as integer SGD cents (`10_000_00` = 1,000,000 cents = 10,000 SGD) and enforced only for amounts above threshold.
- Key rotation keeps old public keys indexed by version and verifies signatures by trying each known public key version.
- Signing logs are append-only and should return defensive copies (`Date` + metadata clone) to avoid external mutation.

## [2026-03-12] Task 12 — Pre-trade Risk Rules Engine
- Implemented `@aoa/risk` as a synchronous rule-evaluation engine with 15 explicit pre-trade rules and per-rule kill-switch controls (`activateRule`/`deactivateRule`).
- Risk result contract returns `risk_score` (capped at 100), `decision`, `reason_codes`, `triggered_rules`, `evaluated_at`, and `evaluation_ms`; caller can append this to Decision Record storage.
- Decision precedence is deterministic: any `BLOCK` rule wins, else any `HOLD`, else score threshold (`> 70`) triggers `HOLD`, else `ALLOW`.
- Input model remains SGD-cent integer first; rapid-succession supports optional `transaction_count_last_5_minutes` and falls back to hourly count when unavailable.
- `bun:test` coverage includes direct rule-level assertions and engine-level behavior (score cap, threshold hold, kill-switch, and metadata timing checks).

## [2026-03-12] Task 13 — Idempotency + Outbox + Saga Orchestration
- `IdempotencyStore` uses in-memory `Map<string, IdempotencyRecord>` with write-once key semantics (`set` throws on duplicate key), plus `has/get/reap` APIs for replay and stale-key cleanup.
- `reap(maxAgeMs)` removes entries older than cutoff regardless of status, which covers stuck `PENDING` keys and supports the 60s timeout recovery scenario.
- `OutboxService` is append-only in memory: `publish` appends immutable event snapshots; `drain` marks only unprocessed events and sets `processed_at` without deleting history.
- `SagaOrchestrator` executes sequential steps and compensates in strict reverse order on failure; returns `COMPENSATED` when rollback succeeds, `FAILED` when compensation has errors.
- Saga lifecycle emits outbox events for execute, complete, fail, compensate execute/complete/fail transitions, enabling downstream async processing/audit.
- Added `bun:test` coverage in `idempotency.test.ts` (14 tests) for idempotent replay, webhook dedup, stale key reaping, outbox drain semantics, and saga compensation/failure paths.

## [2026-03-12] Task 16 — API Gateway + Auth Middleware
- Hono v4.12.7 installed as the only new dependency for `@aoa/api-gateway`. No zod or @aoa/kya dependencies required.
- Dependency inversion pattern: `CapabilityLookup` interface in `middleware/capability.ts` matches `CapabilityTokenService.getById()` signature without importing @aoa/kya. Caller injects the service instance at gateway creation.
- `ValidationSchema` interface (`safeParse(data) → success/error`) is Zod-compatible without importing zod. Gateway defines inline payment validator using this interface.
- Hono `app.use("/api/*", middleware)` applies to all routes under `/api/`. Route-specific middleware (capability, validate) is passed as additional handlers to `app.get(path, mw1, mw2, handler)`.
- Hono `app.request(path, init)` is the standard test pattern — no real server needed. Returns standard `Response` objects.
- Rate limiter uses `Map<string, number[]>` with sliding window cleanup on each request. Old timestamps are filtered out before checking the count.
- PII mask is log-only: `maskPiiFields()` utility exported for structured logging pipelines. Middleware itself is a pass-through hook for production logger integration.
- 11 tests covering all 8 acceptance criteria: 401 unauth, 403 no-capability, 403 expired-capability, 429 rate-limit, 400 validation, 200 health, 200 auth-only, 201 auth+capability+body, plus PII masking utility.
- Build output: 53.44 KB bundled (31 modules), `tsc --noEmit` clean.

## [2026-03-12] Task 14 — Settlement State Machine + SGD Rail Adapter
- SettlementStateMachine has different transition rules from ledger's TransactionStateMachine: settlement adds AUTHORIZED → RELEASING shortcut, SETTLED → DISPUTED, and DISPUTED → REFUNDED|SETTLED resolution paths.
- Escrow support with two condition types: TIME_RELEASE (auto-releases via checkAndAutoRelease when expiresAt < now) and ORACLE_CONFIRM (manual confirmOracle then releaseEscrow).
- SgdRailAdapter implements RailAdapter interface for provider abstraction. Sandbox simulator uses configurable success rate (default 0.95). 100% rate used in tests for determinism.
- Rail adapter returns discriminated union results: success types (PENDING, SETTLED, REFUNDED) vs RailFailureResult { status: 'FAILED', reason: string }. No exceptions for expected failures.
- State machine stores full transition history with metadata (action type, escrow condition details) for audit trail.
- 19 new tests added (total 44 in settlement package). Tests cover all 3 QA scenarios from plan.

## [2026-03-12] Task 15 — Telegram Bot MVP
- Implemented TelegramBotHandler with webhook support for Telegram updates.
- IntentParser recognizes 6 intent types: BALANCE_QUERY, PAYMENT, POLICY_QUERY, HISTORY, AGENT_STATUS, UNKNOWN.
- Payment parsing extracts amount (SGD → cents) and counterparty via regex: `(?:pay|send)\s+(\d+)\s*(?:sgd|dollars?)?\s+(?:to|from)\s+([a-z0-9\-_]+)`.
- PipelineDisplay formats 5-stage OMO-style pipeline with Unicode symbols: ✅ DONE, ⏳ RUNNING, ⬜ PENDING, ❌ ERROR.
- UserRegistry uses in-memory Map for Telegram user_id ↔ AOA account_id mapping (Phase 1 only).
- Hono webhook route: POST /api/v1/telegram/webhook accepts TelegramUpdate JSON, returns TelegramResponse.
- Mock responses: balance (SGD 1,234.56), payment (5-stage pipeline with realistic timings), policy/history/status (mock data).
- 23 comprehensive tests (8 TelegramBotHandler, 6 IntentParser, 3 PipelineDisplay, 5 UserRegistry, 1 placeholder).
- Build: 54.53 KB bundled, 29 modules, tsc clean.
- No external API calls (webhook handler only per requirements).
- No `any` types (strict mode).

## [2026-03-12] Task 17: Pipeline Visualization
- React component in packages/dashboard with Hono SSE server
- tsconfig needs "jsx": "react-jsx" and "jsxImportSource": "react" for TSX
- bun:test can test React component types without DOM (just type checks)
- SSE endpoint uses ReadableStream with text/event-stream content-type

## [2026-03-12] Task 18 — E2E Settlement Flow Integration
- `PaymentPipeline` in api-gateway is easiest to keep dependency-light by using structural service interfaces and constructor injection, so package.json changes are not required.
- Pipeline idempotency can reuse settlement-layer semantics by checking `idempotencyStore.has/get` early and persisting final `PaymentResult` on every terminal outcome.
- Failure-path requirement (record decision on stage failure) is handled by appending a rejection decision in the catch path for all non-compliance-stage failures.
- Gateway integration remains backward-compatible by keeping `/api/v1/payments` fallback behavior (`status: initiated`) when no `paymentPipeline` is injected.
- Added 10 integration tests for pipeline (happy path, idempotency replay, policy deny, risk hold/block, settlement submit/confirm failure, ledger failure, KYA mismatch, p95 latency).
- TypeScript LSP diagnostics tool cannot run in this environment because `typescript-language-server` is not installed; compensated with `tsc --noEmit` lint pass.

## Task 19: AML Rule Engine v1
- AmlEngine follows RiskEngine pattern: class with evaluate() method, validate inputs, return typed result.
- 4 FATF typology rules (structuring, account_takeover, mule_activity, rapid_movement) evaluated in priority order — first match wins.
- Manual review queue uses in-memory Map<case_id, AmlCase> — no auto-SAR, human review mandatory.
- Account takeover detection requires stateful tracking (agentCounterparties Map) across evaluate() calls within engine lifetime.
- ISO 20022 pain.001 validation is separate from AML rules — validates message structure, throws on missing required fields.
- TS strict mode: optional fields (`case_id?: string`) need `as string` assertion in tests after `expect().toBeDefined()` — `toBe()` overload rejects `string | undefined`.
- 14 new tests (exceeds 8 minimum) covering all 4 rules, review queue lifecycle, pain.001 validation, input validation, and clean NALT path.

## [2026-03-12] Task 20 — Travel Rule Adapter (IVMS101)
- TravelRuleService uses adapter pattern (RailAdapter interface) for vendor-agnostic Travel Rule transmission — no vendor lock-in.
- Local IVMS101Payload type defined in compliance package (uses `account_number`, `amount_sgd_cents`, `transaction_date: Date`) differs from shared-types version (uses `account_id`, `amount`, `date: string`). Both are valid — shared-types is ISO 20022 general, compliance is Travel Rule specific.
- Travel Rule threshold: 1,500 SGD = 150_000 cents. Below → skip, at/above → validate + send.
- Zero-PII-at-Rest: evaluate() does not store payload reference after adapter.sendTravelRuleData() — only reference_id returned.
- MockRailAdapter validates required fields in sendTravelRuleData() and returns FAILED for empty fields (defensive mock).
- 16 new tests (exceeds 8 minimum): 3 MockRailAdapter, 13 TravelRuleService (threshold boundary, validation, E2E, zero-PII).
- Total compliance tests: 41 (11 decision-record + 14 AML + 16 travel-rule).

## [2026-03-12] Task 21 — Dispute/Case Management Service
- DisputeService follows AmlEngine pattern: class with Map-based in-memory store, case IDs prefixed `DSP-`.
- Auto-accept threshold: < 5,000 cents (50 SGD) → immediate RESOLVED + AUTO_REFUND. At threshold → not auto-accepted (strictly less than).
- SLA deadline uses `addBusinessDays()` helper that skips Saturday (6) and Sunday (0).
- State machine: EVIDENCE_GATHERING → SUBMITTED → RESOLVED. Auto-accepted disputes skip directly to RESOLVED.
- Evidence can only be added in EVIDENCE_GATHERING (or RECEIVED) state — not after SUBMITTED or RESOLVED.
- 14 new tests (exceeds 8 minimum): auto-accept, threshold boundary, full lifecycle, agent filtering, state transition errors, SLA breach detection, validation, edge cases.
- Total compliance tests: 55 (11 decision-record + 14 AML + 16 travel-rule + 14 dispute).

## [2026-03-12] Task 22 — Reconciliation Engine
- ReconciliationEngine in `@aoa/ledger` matches by `payment_id` (ledger) to `reference_id` (provider) and classifies four break types: AMOUNT_MISMATCH, MISSING_IN_PROVIDER, MISSING_IN_LEDGER, TIMING_MISMATCH.
- Timing mismatch behavior is explicit: same amount with settlement delta `< 24h` is auto-matched and excluded from manual queue; `>= 24h` remains a timing break for manual review.
- Manual review queue is retained in engine memory as cumulative non-auto-matched breaks across reconciliation runs; per-run report also includes a run-scoped `manual_review_queue` snapshot.
- `generateDailyReport(date)` returns markdown with run count, aggregate totals, and manual review item lines for the selected UTC day.
- Added 9 reconciliation tests in `reconciliation.test.ts` (including 100-record happy path and 500 SGD vs 450 SGD QA mismatch case); ledger package tests now pass at 27/27.
- LSP diagnostics cannot execute in this environment (`typescript-language-server` missing), so verification used `bun run build --filter=@aoa/ledger` (`tsc --emitDeclarationOnly`) as strict type gate.

## [2026-03-12] Task 23 — Ops Dashboard KPI Aggregator
- `KpiAggregator` in `@aoa/dashboard` tracks raw KPI events and computes point-in-time snapshot metrics with zero-safe denominator handling.
- Fraud KPI uses basis points (`fraud_loss_bps = fraud_loss_cents / settlement_volume_cents * 10_000`); settlement volume is derived from settlement success/failure event amounts.
- KPI time series can be generated by interval via `getTimeSeries(intervalMinutes)` using closed buckets (`from <= event <= to`) from first to last event timestamp.
- Hono KPI API pattern mirrors existing dashboard server style: in-memory aggregator instance, `app.request()` friendly routes, and input validation returning 400 on malformed payload/query.
- Added 9 KPI-focused tests (aggregator + API) with `bun:test`; dashboard package now passes 16 tests total.
- LSP diagnostics remain unavailable locally due to missing `typescript-language-server`; verification continues via package build/type emission.

## [2026-03-12] Task 24 — Maturity Ladder UX (4-stage autonomy)
- Avoid module-name collisions when both `maturity.ts` and `maturity.tsx` exist: Bun resolves `./maturity` to the TSX module first in this package context.
- Stable pattern used: keep canonical service/types in `maturity-service.ts`, keep required `maturity.ts` as a re-export barrel, and expose UI from `maturity-ladder.tsx` with required `maturity.tsx` as a re-export.
- `MaturityLadderService.transition()` enforces one-step forward progression only (`targetIndex === currentIndex + 1`) to match upgrade-ladder UX semantics.
- `renderToStaticMarkup` + `React.createElement` is a reliable `bun:test` pattern for TS (`.ts`) component tests without requiring DOM/jsdom.
- LSP diagnostics check attempted on all changed dashboard files, but local environment still lacks `typescript-language-server`; `bun run build --filter=@aoa/dashboard` passed as type-safety gate.

## [2026-03-12] Task 26 — Slack Bot with Block Kit Integration
- SlackBotHandler mirrors TelegramBotHandler structure but returns Block Kit JSON (`{ blocks: [...] }`) instead of plain text.
- Slack uses string user IDs (e.g., "U_TEST") vs Telegram's numeric IDs — SlackWorkspaceRegistry uses `Map<string, string>` instead of `Map<number, string>`.
- Block Kit format: `type: "section"` with `mrkdwn` text, `type: "divider"`, `type: "actions"` with button elements.
- Payment responses use `response_type: "in_channel"` (visible to all), other responses use `"ephemeral"` (visible only to user).
- Slash command payload is `application/x-www-form-urlencoded`; interaction payload wraps JSON in a `payload` form field.
- `toFixed(2)` does NOT add thousand separators — use `toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` for "1,234.56" format.
- 15 new tests (10 SlackBotHandler + 5 SlackWorkspaceRegistry), total messenger-bot: 38 tests.
- createMessengerBotApp() now accepts optional SlackWorkspaceRegistry and sets up both Telegram and Slack routes.

## [2026-03-12] T25: Privacy & Data Governance
- PII masking approach: regex-based pattern matching for names, accounts, addresses — no ML needed for MVP
- Data classification uses field-name pattern matching (contains "name" → RESTRICTED, "amount" → CONFIDENTIAL, etc.)
- Gateway cross-package dependency avoided: used `DecisionLookup` interface injection instead of importing `@aoa/compliance` directly
- Role-based access via `X-Audit-Role` header: OPERATOR gets masked, AUDITOR/ADMIN get full data
- PDPA checklist: 13 items covering Singapore's Personal Data Protection Act requirements
- DataRetentionConfig as `as const` object — immutable at TypeScript level
- Compliance package now at 78 tests (55 existing + 23 new privacy tests)
