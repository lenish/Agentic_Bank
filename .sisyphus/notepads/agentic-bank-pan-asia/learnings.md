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
