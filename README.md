# AOA — Agent Operating Account

Bank-grade financial infrastructure for autonomous AI agents. Purpose-built for enterprises deploying agents that need to spend, settle, and comply — with full audit trails.

**Joint venture**: SC Ventures × Hashed

> **Pitch Deck**: [aoa-pitch.vercel.app](https://aoa-pitch.vercel.app)

---

## What is AOA?

Every enterprise is deploying autonomous AI agents. These agents need to spend money, settle invoices, manage budgets, and comply with regulations — but no bank offers an account designed for machines.

AOA is the **trust layer** between enterprise AI and the financial system: per-agent sub-accounts with policy-bound spending, real-time risk scoring, and automated settlement via API + messenger.

---

## Architecture: 8-Layer Agentic Banking Stack

| Layer | Function | Package |
|-------|----------|---------|
| **KYA Identity** | SPIFFE ID + mTLS — machine-native identity | `@aoa/kya` |
| **Capability Delegation** | Bounded tokens: action, amount, TTL, counterparty | `@aoa/shared-types` |
| **Policy Engine** | OPA/Cedar deny-by-default rules | `@aoa/policy` |
| **Risk Scoring** | 15 pre-trade rules, <100ms p95 | `@aoa/risk` |
| **Ledger** | Double-entry, isolated per-agent sub-accounts | `@aoa/ledger` |
| **Settlement** | State machine + fiat/stablecoin rail adapters | `@aoa/settlement` |
| **Dispute / Recon** | Auto-accept <$50, SLA tracking, daily recon | `@aoa/compliance` |
| **Compliance** | Osprey AML + IVMS101 Travel Rule adapter | `@aoa/compliance` |

---

## Monorepo Structure

```
agentic-bank/
├── packages/
│   ├── api-gateway/       # @aoa/api-gateway — REST/gRPC entry point
│   ├── compliance/        # @aoa/compliance — AML, Travel Rule, dispute/recon
│   ├── dashboard/         # @aoa/dashboard — Operator web dashboard
│   ├── kya/               # @aoa/kya — Know Your Agent identity service
│   ├── landing/           # @agentic-bank/landing — Next.js marketing site
│   ├── ledger/            # @aoa/ledger — Double-entry ledger core
│   ├── messenger-bot/     # @aoa/messenger-bot — Telegram/Slack interface
│   ├── policy/            # @aoa/policy — OPA/Cedar policy engine
│   ├── risk/              # @aoa/risk — Real-time risk scoring
│   ├── settlement/        # @aoa/settlement — Fiat + stablecoin settlement
│   └── shared-types/      # @aoa/shared-types — Shared TypeScript types
├── docs/
│   ├── pitch/             # Investor pitch site (deployed to Vercel)
│   └── investment-memo-scv.md
├── resource/              # SVG/PNG diagrams, logos
├── docker-compose.yml     # Local infra (Postgres, Redis, Redpanda)
├── openapi.yaml           # API specification (OpenAPI 3.1)
├── turbo.json             # Turborepo task config
└── tsconfig.base.json     # Shared TypeScript config
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | [Bun](https://bun.sh) 1.2.4 |
| **Language** | TypeScript 5.7 (strict, ES2022) |
| **Monorepo** | Bun Workspaces + [Turborepo](https://turbo.build) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Streaming** | [Redpanda](https://redpanda.com) (Kafka-compatible) |
| **Identity** | SPIFFE/SPIRE + mTLS |
| **Policy** | OPA / Cedar |
| **AML** | Osprey + IVMS101 |
| **Frontend** | Next.js (landing), React (dashboard) |
| **API Spec** | OpenAPI 3.1 |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.2.4
- [Docker](https://docs.docker.com/get-docker/) (for local infra)

### Setup

```bash
# Clone
git clone https://github.com/lenish/Agentic_Bank.git
cd Agentic_Bank

# Install dependencies
bun install

# Start local infrastructure (Postgres, Redis, Redpanda)
docker compose up -d

# Run all packages in dev mode
bun run dev

# Build all packages
bun run build

# Run tests
bun run test

# Lint
bun run lint

# Type check
bun run typecheck
```

---

## GTM Strategy

| Wave | Timeline | Focus |
|------|----------|-------|
| **Wave 1** | Month 0–6 | Singapore MAS sandbox entry, KYA + Ledger core |
| **Wave 2** | Month 7–12 | Policy + Risk engine, first enterprise pilots |
| **Wave 3** | Month 13–18 | Settlement rails (fiat + stablecoin), compliance |
| **Wave 4** | Month 19+ | Pan-Asia expansion (HK, UAE, Japan) |

---

## Regulatory

- **Target**: MAS Payment Services Act (PSA) license via sandbox pathway
- **Compliance**: Designed for MAS sandbox-readiness
- **AML/CFT**: Osprey integration + IVMS101 Travel Rule
- **Identity**: Machine-native KYA (Know Your Agent) framework

---

## License

Proprietary. All rights reserved.
