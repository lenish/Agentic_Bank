# Agentic Bank — Technical Datasheet

## Overview

Agentic Bank is a regulated financial infrastructure platform that provides autonomous AI agents with their own bank accounts (Accounts of Agency — AOA). The platform implements a 7-layer security stack ensuring every agent transaction is identified, authorized, risk-scored, and audited.

## Architecture

### Account of Agency (AOA)

Each AI agent receives a dedicated AOA with:

- **SPIFFE/SVID identity** — cryptographic agent identity bound to workload attestation
- **Capability tokens** — scoped permissions (e.g., `transfer:sgd:max_1000`) with TTL
- **Risk profile** — continuously updated risk score based on transaction history
- **Audit trail** — immutable log of every decision and transaction

### 7-Layer Security Stack

#### Layer 1: KYA Identity (Know Your Agent)

- SPIFFE/SVID-based identity framework
- Workload attestation via SPIRE
- Agent identity lifecycle management (provisioning, rotation, revocation)

#### Layer 2: Capability Token Delegation

- JSON-based capability tokens with hierarchical scoping
- Principal → agent delegation chains
- Automatic token expiry and revocation

#### Layer 3: Deny-by-Default Policy Engine

- OPA (Open Policy Agent) integration
- Policy-as-code with version control
- Real-time policy evaluation (<5ms p99)

#### Layer 4: Pre-Trade Risk Engine

- 15 built-in risk rules:
  - Single transaction limit
  - Daily/weekly/monthly volume caps
  - Counterparty concentration limits
  - Velocity checks (transaction frequency)
  - Cross-border transfer restrictions
  - Currency pair limits
  - Time-of-day restrictions
  - Agent maturity gating
  - Anomaly detection (deviation from historical pattern)
  - Sanctions screening
  - PEP (Politically Exposed Persons) check
  - Adverse media screening
  - Geographic risk scoring
  - Network analysis (related entity detection)
  - Behavioral biometrics (agent execution pattern)

#### Layer 5: SGD Settlement Rail

- Real-time SGD settlement via FAST (Fast And Secure Transfers)
- Atomic commit with two-phase confirmation
- Settlement finality guarantee
- Multi-currency support roadmap (HKD, JPY, AUD)

#### Layer 6: AML/Travel Rule Compliance

- Real-time AML screening against sanctions lists
- FATF Travel Rule compliance for cross-border transfers
- Suspicious Transaction Report (STR) auto-generation
- Regulatory reporting (MAS TRM guidelines)

#### Layer 7: Immutable Decision Records

- Append-only audit log for every transaction decision
- Cryptographic chaining (hash-linked records)
- Regulatory-grade retention (7+ years)
- Export in standard formats (ISO 20022, XBRL)

## Maturity Ladder

Agents progress through four maturity stages with increasing autonomy:

| Stage | Description | Autonomy |
|-------|-------------|----------|
| Rule-Only | All actions require pre-approval | None |
| Assisted | AI recommendations with human approval | Low |
| Bounded | Autonomous within defined limits | Medium |
| Portfolio | Full portfolio management autonomy | High |

## Performance Specifications

| Metric | Target |
|--------|--------|
| Risk evaluation latency | <50ms p99 |
| Policy evaluation latency | <5ms p99 |
| Settlement confirmation | <3s (FAST rail) |
| API availability | 99.95% SLA |
| Audit query response | <100ms p95 |
| Agent onboarding | <5 minutes |

## Integration

- **REST API** with OpenAPI 3.1 specification
- **Webhook** notifications for transaction events
- **SDK** support: TypeScript, Python
- **Authentication**: mTLS + API key

## Compliance

- MAS Regulatory Sandbox participant
- MAS TRM Guidelines compliant
- FATF Travel Rule compliant
- SOC 2 Type II (planned)

## Deployment

- Cloud-native (Kubernetes)
- Multi-region (SGP primary, HKG DR)
- Data residency: Singapore (MAS jurisdiction)
