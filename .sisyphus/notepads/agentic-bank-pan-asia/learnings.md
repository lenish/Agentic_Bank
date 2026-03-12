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
