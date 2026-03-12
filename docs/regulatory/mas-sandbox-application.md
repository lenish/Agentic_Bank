# MAS FinTech Regulatory Sandbox — Application Draft

**Applicant**: AoaBank Pte. Ltd. (In-incorporation)
**Parent Entity**: SC Ventures (Standard Chartered)
**Date**: March 2026
**Status**: DRAFT for MAS Pre-consultation

---

## 1. Executive Summary

AoaBank Pte. Ltd. ("AoaBank") seeks entry into the MAS FinTech Regulatory Sandbox to pilot **Agent Operating Accounts (AOA)**. AOA is a novel financial primitive designed for the machine economy, enabling autonomous AI agents to hold, manage, and transact funds within strictly defined, cryptographically enforced boundaries. 

By leveraging capability delegation and immutable decision audit trails, AoaBank provides the trust layer necessary for autonomous agent commerce while maintaining institutional-grade compliance with the Payment Services Act (PSA).

## 2. Problem Statement

The rise of autonomous AI agents (LLM-based agents, autonomous procurement bots, etc.) has created a gap in the financial ecosystem:
1. **Identity Gap**: Current banking systems are designed for humans or legal entities, not autonomous software agents.
2. **Authorization Gap**: Existing API keys are "all-or-nothing," lacking the granular, bounded delegation required for safe agent autonomy.
3. **Auditability Gap**: Traditional transaction logs do not capture the "reasoning" or "policy context" behind an autonomous financial decision.

## 3. Proposed Solution: Agent Operating Accounts (AOA)

AoaBank introduces a three-layered architecture to solve these gaps:
- **Identity Layer (KYA)**: "Know Your Agent" framework using SPIFFE-based verifiable identities.
- **Policy Layer (PDP)**: Deny-by-default policy engine that enforces per-transaction and cumulative limits.
- **Audit Layer (Decision Record Plane)**: Immutable storage of the reasoning, policy version, and model snapshot for every agent transaction.

## 4. Technology Architecture

AoaBank is built on a modern, cloud-native stack designed for high-integrity financial operations:
- **Core Ledger**: Double-entry, append-only ledger with net-zero validation.
- **Capability Tokens**: Bounded, non-transferable tokens that define the specific "rights" an agent has (e.g., "Pay up to S$50 to Vendor X").
- **Risk Engine**: Real-time pre-trade risk evaluation with 15+ rules including velocity, structuring, and anomaly detection.
- **Settlement Rails**: Integration with SGD domestic rails (FAST/GIRO) via standardized adapters.

## 5. Risk Management Framework

AoaBank adopts a "Compliance-as-Code" approach:
- **Technology Risk**: Alignment with MAS TRM Guidelines; multi-layer auth, PII masking, and encrypted secrets management.
- **Operational Risk**: Human-in-the-loop overrides for high-value transactions (>S$10,000) and kill-switch capabilities for all agents.
- **Liquidity Risk**: 1:1 safeguarding of customer funds in segregated trust accounts.

## 6. AML/CFT Controls

AoaBank implements a comprehensive AML/CFT framework:
- **Transaction Monitoring**: Real-time detection of FATF typologies (structuring, mule activity, rapid movement).
- **Travel Rule**: IVMS101-compliant data transmission for transactions exceeding S$1,500.
- **Sanctions Screening**: Integration with global watchlists for all counterparties.
- **Manual Review**: Dedicated compliance queue for suspicious activity reporting (SAR).

## 7. Data Protection & Consumer Protection

- **PDPA Compliance**: Strict data minimization, purpose limitation, and PII masking for operational staff.
- **Transparency**: Clear disclosure to all sandbox participants regarding the experimental nature of the service.
- **Dispute Management**: Automated case management with defined SLAs and auto-refunds for low-value disputes (<S$50).

## 8. Sandbox Boundaries & Exit Strategy

### 8.1 Proposed Boundaries
- **Duration**: 12 months.
- **Customer Cap**: 100 pilot corporate customers.
- **Transaction Limit**: S$5,000 per transaction; S$200,000 aggregate daily volume.
- **Geographic Scope**: Singapore domestic transfers only (SGD).

### 8.2 Exit Strategy
- **Path to License**: Upon successful completion, AoaBank will apply for a Standard Payment Institution (SPI) license under the PSA.
- **Orderly Wind-down**: In the event of sandbox failure, all customer funds will be returned via the primary settlement rail within 30 days, and all agent identities will be revoked.

---

*This document is a draft and subject to legal review by Allen & Gledhill.*
