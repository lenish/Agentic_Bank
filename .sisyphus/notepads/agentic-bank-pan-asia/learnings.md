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
