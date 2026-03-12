# Investment Memo: Agentic Banking Infrastructure (AOA)

**Date**: March 2026 | **Stage**: Pre-Seed / Joint Venture | **Partners**: SC Ventures × Hashed | **Market**: Pan-Asia (Singapore first)

---

## Thesis

Every enterprise is deploying autonomous AI agents. These agents will need to spend money, settle invoices, manage budgets, and comply with regulations — **but today, no bank offers an account designed for machines.**

We build the **Agent Operating Account (AOA)**: bank-grade financial infrastructure purpose-built for autonomous agents. Not a neobank. Not a wallet. The **trust layer** between enterprise AI and the financial system.

## Problem

| Today | Tomorrow (2027+) |
|-------|------------------|
| Agents use shared corporate cards or human-proxied payments | Every enterprise runs 10-100+ agents with independent budgets |
| No identity standard for machine actors | Regulators require KYA (Know Your Agent) — who delegated, what limits, full audit trail |
| Manual expense reconciliation | Real-time policy enforcement, automated settlement, instant dispute resolution |

The gap: **banks don't have products for non-human economic actors.** First mover captures the infrastructure layer.

## Solution: 8-Layer Agentic Banking Stack

| Layer | Function | Why It Matters |
|-------|----------|---------------|
| **KYA Identity** | SPIFFE ID + mTLS — machine-native identity | Agent ≠ human. Different auth model. |
| **Capability Delegation** | Bounded tokens: action, amount, TTL, counterparty | Owner controls what agent can do. Revocable. |
| **Policy Engine** | OPA/Cedar deny-by-default | No spend without explicit policy. Shadow eval before deploy. |
| **Risk Scoring** | 15 pre-trade rules, <100ms p95 | Velocity, structuring, anomaly — real-time, kill-switchable. |
| **Blockchain Infra** | Multi-chain adapter + KMS-based signing | EVM/Solana/Cosmos — agents never hold raw keys. |
| **Stablecoin Settlement** | USDC/USDT + on-chain rail adapters | Instant cross-border settlement alongside fiat SGD. |
| **Settlement** | State machine + SGD rail adapter | Escrow, idempotent saga, provider-agnostic. |
| **Dispute/Recon** | Auto-accept <$50, SLA tracking, daily recon | Machine-speed dispute handling. |
| **Compliance** | Osprey AML + IVMS101 Travel Rule adapter | MAS-ready from day one. |

**UX**: Messenger-first (Telegram/Slack) with real-time 5-stage pipeline visualization. Enterprise operators see every decision an agent makes, in real time.

## Why SC Ventures × Hashed

| SC Ventures Brings | Hashed Brings | We Bring |
|--------------------|---------------|----------|
| MAS regulatory pathway + sandbox sponsorship | Blockchain infrastructure + multi-chain expertise | Full-stack product engineering (8-layer infra) |
| Pan-Asia banking licenses (SG, HK, UAE) | Web3 ecosystem network + protocol partnerships | AI-native UX + developer API |
| Enterprise distribution (SC corporate clients) | Crypto-native distribution + DeFi integrations | Operational execution (build → ship → iterate) |
| Venture governance (Zodia/Nexus/Libeara playbook) | Token economics + stablecoin rails expertise | Domain expertise: fintech infra + agent systems |

**Operating Model**: Separate legal entity (Zodia archetype). SCV = origination/regulatory/distribution. Hashed = blockchain infra/crypto ecosystem/Web3 network. We = product/eng/ops. Stage-gate governance with clear DRI ownership.

## Go-to-Market

**Phase 1 (Month 0-8)**: Singapore — MAS FinTech Regulatory Sandbox. Dual rail (SGD domestic + USDC/USDT stablecoin). 3 pilot customers from SC and Hashed networks.

**Phase 2 (Month 9-18)**: Hong Kong + UAE expansion. Multi-currency. Advanced risk models. 20+ enterprise customers.

**Pricing**: Free tier (100 tx/month) → Token-based usage billing. Land with free, expand with volume.

## Traction & Milestones

| Milestone | Timeline | Status |
|-----------|----------|--------|
| Operating Charter signed | Month 0 | Ready to execute |
| Entity incorporation (SG) | Month 1 | Zodia model defined |
| MVP: E2E agent payment flow | Month 5 | Architecture complete, Momus-approved plan |
| MAS sandbox application | Month 6 | Requirements analyzed |
| 3 pilot customers live | Month 10 | SC network pipeline |
| Series A readiness | Month 12 | Revenue + regulatory traction |

## The Ask

**Joint venture formation** with SC Ventures and Hashed to build AOA as a standalone entity.

- **Capital**: $3-5M seed (SCV + Hashed co-invest)
- **Regulatory**: MAS sandbox sponsorship via SC banking license
- **Blockchain**: Multi-chain infrastructure + stablecoin settlement rails (Hashed)
- **Distribution**: 3 pilot enterprise introductions from SC corporate + Hashed Web3 networks
- **Timeline**: 12-month build to commercial launch

## Why Now

1. **Agent adoption is accelerating** — OpenAI, Anthropic, Google all shipping agent frameworks in 2025-2026
2. **Regulators are moving** — MAS, HKMA, VARA all have sandbox programs; first-mover regulatory advantage
3. **No incumbent solution** — traditional banks don't have machine-native products; fintechs lack banking licenses
4. **SC Ventures has the playbook** — Zodia (crypto custody), Nexus (trade finance), Libeara (tokenization) prove the model works
5. **Stablecoin rails are production-ready** — USDC/USDT on EVM chains provide instant, low-cost cross-border settlement without correspondent banking

---

> *"We don't build a bank for agents. We build the operating system that lets agents use banks."*
