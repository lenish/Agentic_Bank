# Internal Strategy Memo: Agentic_Bank

**Status**: Internal Alignment Draft | **Date**: March 2026 | **Audience**: Core Team

---

## 1. Why We Exist

Every enterprise is deploying autonomous AI agents, but the financial system still assumes that all economic actors are humans or legal entities acting through humans.

This creates four gaps:

1. **Identity gap**: no machine-native standard for who an agent is and who delegated authority to it.
2. **Authorization gap**: API keys and shared cards are too broad for bounded autonomy.
3. **Auditability gap**: existing payment logs do not capture why an autonomous action was permitted.
4. **Operational gap**: finance, compliance, and risk teams cannot safely supervise machine-speed activity.

Agentic_Bank exists to close these gaps.

Our product is not a neobank and not a wallet. It is the **trust and control layer** that allows agents to use banks, payment rails, and settlement providers safely.

---

## 2. What We Are Building

Our core product is the **Agent Operating Account (AOA)**.

AOA gives each agent a machine-native operating boundary with:

- verifiable identity
- bounded delegated authority
- policy-enforced execution
- real-time risk controls
- auditable settlement and reconciliation
- immutable decision records

In practice, the product should feel like:

> "A financial execution system where every agent action is attributable, bounded, reviewable, and reversible where appropriate."

That means our job is not to reinvent banking from scratch. Our job is to make existing financial infrastructure usable by autonomous systems without breaking compliance, risk, or operational trust.

---

## 3. Product Thesis

We believe the winning wedge is:

**Give enterprises a safe way to let AI agents spend, settle, and operate within explicit limits, with bank-grade controls and full auditability.**

If we do this well, we become the control plane for agentic commerce.

The product must satisfy five conditions from day one:

1. **Authentication is not delegation**.
2. **Every financial action is policy checked before execution**.
3. **Every decision is immutably recorded**.
4. **Money movement is idempotent and reconcilable**.
5. **Human operators can intervene, review, and shut down safely**.

---

## 4. Product Architecture We Must Commit To

The repo currently describes an 8-layer architecture. Internally, we should treat that as the reference model:

1. **KYA Identity**
2. **Capability Delegation**
3. **Policy Engine**
4. **Risk Engine**
5. **Blockchain Infrastructure**
6. **Stablecoin Settlement**
7. **Settlement and Reconciliation**
8. **Compliance, Dispute, and Audit**

However, the most important operational distinction is not the number of layers. It is the difference between **Phase 1 launch-critical layers** and **Phase 2 expansion layers**.

### Phase 1 launch-critical

- KYA identity
- capability delegation
- deny-by-default policy engine
- pre-trade risk rules
- double-entry ledger
- SGD settlement adapter
- idempotency and saga controls
- immutable decision records
- AML and Travel Rule foundations

### Phase 2 expansion

- stablecoin settlement rails
- blockchain signing abstraction beyond initial provider
- async finality and reorg handling
- multi-asset ledger
- broader multi-jurisdiction support

This distinction matters because our internal decisions already point to **SGD-first Phase 1** even though some external materials tell a dual-rail story.

Internal rule:

> We market long-term dual-rail potential, but we build Phase 1 around a single bounded fiat path that can survive regulatory scrutiny.

---

## 5. What Phase 1 Really Is

Phase 1 is not "agent banking at full scale".

Phase 1 is a **regulated proof that autonomous financial execution can be made safe**.

The right Phase 1 scope is:

- Singapore only
- MAS sandbox pathway
- one legal entity
- one primary settlement rail
- SGD only
- small transaction limits
- small customer cohort
- narrow action allowlist

The narrow action allowlist should look like:

- `read_balance`
- `initiate_transfer`
- `schedule_payment`
- `cancel_payment`
- `view_decision_record`

This is intentionally conservative. The objective is to prove control, not breadth.

---

## 6. Non-Negotiable Product Requirements

Three requirements appear repeatedly across the plan, governance, and Oracle reviews. They are non-negotiable.

### 6.1 Capability Delegation

We must separate identity from authority.

Every agent action needs a bounded capability object with at least:

- principal
- agent_id
- action_set
- amount_limit
- counterparty_scope
- ttl
- frequency limit
- revocation support

If we skip this, we do not have safe autonomy. We only have machine-operated credentials.

### 6.2 Decision Record Plane

Every approval, rejection, hold, override, and execution outcome must create an immutable record.

Minimum fields:

- input snapshot
- trace_id
- policy_version
- model_version where relevant
- reason_codes
- actor or override metadata
- timestamps
- outcome

If we skip this, we cannot defend the product to regulators, customers, or ourselves.

### 6.3 Provider Adapter Pattern

Rails, AML providers, and compliance vendors must sit behind adapters.

This protects us from:

- vendor lock-in
- inconsistent audit formats
- brittle integration logic
- uncontrolled multi-rail growth

---

## 7. Regulatory Strategy

### 7.1 Regulatory posture

We should frame Agentic_Bank as a **control and orchestration layer for agentic financial execution**, not as an uncontrolled autonomous bank.

That posture lowers confusion and helps align product scope with MAS expectations.

### 7.2 Singapore first

Singapore is the correct starting jurisdiction because:

- SC Ventures has strong local leverage
- MAS has an established sandbox pathway
- the jurisdiction is credible for enterprise fintech
- a clean Singapore proof point supports later expansion

### 7.3 Sandbox approach

The sandbox is not a shortcut. It is a controlled proving ground.

What matters most is not feature count, but whether we can demonstrate:

- clear test boundaries
- customer safeguards
- incident handling
- reversible failure modes
- operational oversight
- compliance evidence

### 7.4 Licensing path

Current internal direction points toward **Standard Payment Institution** assumptions for Phase 1, with a later upgrade path if scale warrants it.

We should treat this as a working operating assumption, not a legal conclusion.

### 7.5 What the control layer owns and does not own

The AOA control layer should be treated as an internal control and evidence system, not as a replacement for external legal or regulatory obligations.

In Phase 1, the control layer **does own**:

- delegated authority boundaries
- policy evaluation and approval logic
- risk decisioning
- immutable audit and decision records
- operator review surfaces
- reconciliation and incident evidence

In Phase 1, the control layer **does not replace**:

- legal and regulatory accountability of licensed entities
- customer fund safeguarding obligations
- provider-level settlement finality rules
- external AML reporting obligations that require human or licensed-party action

### 7.6 The key regulatory message

Our message should be:

> "We are making autonomous financial activity more controllable, more observable, and more auditable than human-driven legacy workflows."

That is much stronger than saying "we let agents bank on their own."

---

## 8. Operating Model and Team Responsibilities

The cleanest operating split remains:

- **SC Ventures**: origination, regulatory interface, institutional distribution, governance
- **Hashed**: blockchain ecosystem leverage, stablecoin and Web3 strategy, Phase 2 rail expansion
- **Execution Team**: product, engineering, operations, reliability, evidence generation

Our internal operating rule should be:

> The party that owns the risk decision must also own the escalation path.

That means:

- SCV owns regulatory sponsorship and external regulatory commitments.
- We own product execution, production behavior, technical controls, and delivery truth.
- Hashed contributes where blockchain or stablecoin rails are truly required, but should not expand Phase 1 scope prematurely.

### DRI principle

Every major deliverable needs one DRI. No co-ownership.

### Decision rights

The following decisions need explicit ownership:

- **Risk policy changes**: Execution Team proposes, SCV signs off when regulatory posture is affected.
- **Launch readiness**: Delivery Lead owns technical readiness; SCV owns market and regulatory readiness.
- **Incident command**: Execution Team owns technical incident command; SCV owns external regulatory and partner escalation.
- **Phase-gate progression**: Steering Committee decides based on agreed KPI and control thresholds.
- **Phase 2 rail expansion**: requires explicit approval after Phase 1 proof points are met.

### Governance cadence

- Weekly delivery review
- Bi-weekly control review
- Monthly steering review
- Quarterly strategy review

### Escalation triggers

At minimum, internal escalation must fire for:

- critical security incidents
- regulatory inquiry or failed control
- launch delay beyond threshold
- reconciliation break rate beyond threshold
- kill-switch failure or override failure

---

## 9. Product Roadmap

### Wave 1: Foundation and entity setup

Goal: define the venture and build the trust primitives.

Deliver:

- operating charter
- entity and sandbox prep
- monorepo and CI
- shared types and API schema
- ledger core
- KYA identity
- capability tokens
- decision record storage

Day 1 operational minimums for sandbox readiness must also be designed here even if implementation lands across later waves:

- audit-grade logging
- monitoring and alerting
- permission and revocation paths
- incident response ownership
- reconciliation visibility

### Wave 2: Core financial execution

Goal: make bounded execution real.

Deliver:

- policy engine
- wallet and sub-account logic
- signing service
- pre-trade risk engine
- idempotency and saga
- settlement state machine
- API gateway
- messenger-first interface

### Wave B: Dual-rail preparation

Goal: make the architecture rail-aware without destabilizing Phase 1.

Deliver:

- rail-aware contract model
- settlement adapter abstraction
- stablecoin rail skeleton
- signing port
- async finality model
- multi-asset ledger extension
- redaction and audit extension

This wave is strategically important because it aligns the long-term product story with the codebase, but it must not derail Phase 1 sandbox readiness.

### Wave 3: Compliance, integration, operator trust

Goal: prove that the system works end to end and can be supervised.

Deliver:

- end-to-end payment pipeline
- AML rules engine
- Travel Rule adapter
- dispute management
- reconciliation
- ops dashboard
- maturity ladder UX
- privacy and governance controls
- Slack channel support

### Wave 4: Launch readiness

Goal: turn the system into a saleable and reviewable product.

Deliver:

- MAS evidence package
- security audit
- pilot onboarding
- load and stress testing
- model risk governance
- landing and GTM materials
- incident playbooks
- pricing engine

---

## 10. Phase Gates and Progression Rules

We should not move between phases based on intuition alone.

### Gate A: Foundation -> bounded execution

Wave 2 scale-up should only proceed once we can prove:

- capability delegation is enforced correctly
- decision record coverage is effectively complete
- ledger invariants hold under replay and failure scenarios
- revocation and kill-switch controls work in testing

### Gate B: bounded execution -> sandbox launch readiness

Pilot or sandbox launch should only proceed once we can prove:

- one end-to-end payment path works consistently
- reconciliation breaks are within threshold
- operator dashboards and incident paths are usable
- AML alert flow and dispute flow are operational
- launch-critical evidence artifacts exist and are current

### Gate C: sandbox proof -> dual-rail expansion

Phase 2 expansion should only proceed once we can prove:

- Phase 1 controls are stable over real traffic
- no material control failures remain unresolved
- pilot customers validate the control plane value proposition
- rail abstraction is justified by real customer demand, not only roadmap ambition

---

## 11. Go-to-Market Strategy

### 11.1 The wedge

We should not sell "AI banking" as a concept.

We should sell:

**safe agent spend and settlement infrastructure for enterprises**.

The first customer pain is not inspiration. It is control.

The customer wants to know:

- who allowed this action
- what the agent was allowed to do
- why this payment was accepted or blocked
- how finance can review and reconcile it
- what happens when something goes wrong

### 11.2 Initial customer profile

The best initial customers are design partners with:

- repetitive payment or finance workflows
- willingness to operate in a sandboxed environment
- internal pressure to adopt AI agents
- enough sophistication to value auditability

Good early use cases:

- procurement agent spend controls
- recurring vendor payments
- treasury or finance ops automation with bounded authority

### 11.3 Market sequencing

1. **Design partners** through SC Ventures and trusted network channels
2. **Pilot proof points** with bounded production traffic
3. **Referenceable enterprise case studies**
4. **Expansion motion** through compliance, reliability, and API integration trust

### 11.4 Messaging hierarchy

Our message should progress in this order:

1. control
2. auditability
3. compliance readiness
4. operational efficiency
5. new rail and cross-border upside

If we lead with stablecoins or autonomous finance futurism too early, we increase friction with risk, legal, and procurement buyers.

### 11.5 Pricing model

The current direction remains sound:

- free entry tier for initial adoption
- usage-based expansion
- premium layers for risk, SLA, advanced controls, and reporting

This fits the likely buyer journey: land with experimentation, expand through governance and volume.

---

## 12. Metrics That Actually Matter

We should manage the business with a small set of hard metrics.

### Trust and control

- decision record coverage
- delegation validation rate
- policy deny or allow accuracy against expectations
- override correctness

### Reliability and money movement

- settlement success rate
- reconciliation break rate
- rollback success rate
- idempotency replay safety

### Compliance and operations

- AML alert handling SLA
- dispute turnaround time
- incident MTTR
- kill-switch drill success rate

### GTM and adoption

- pilot conversion
- active enterprise accounts
- transaction volume per customer
- expansion from free to paid

---

## 13. The Biggest Risks

### 13.1 Product risk

We try to do too much too early and lose the ability to prove safety.

### 13.2 Regulatory risk

We let the external story outrun the actual control surface.

### 13.3 GTM risk

We sell a future-state stablecoin vision before we have a reliable Phase 1 control product.

### 13.4 Operating risk

We treat AML, dispute, or audit as "add-on modules" instead of core operating requirements.

### 13.5 Strategic risk

We blur the line between what SCV owns, what we own, and what Hashed should influence later.

---

## 14. What We Must Keep Aligned Internally

There are a few tensions in the current materials that we should resolve deliberately.

### Tension 1: 7-layer versus 8-layer narrative

Internal product work should standardize on the 8-layer reference architecture.

### Tension 2: SGD-first versus dual-rail story

Internal build plan should remain SGD-first for Phase 1.
External messaging can describe dual-rail as the strategic roadmap, not the immediate launch scope.

### Tension 3: product breadth versus regulatory clarity

When in doubt, choose narrower scope with better evidence.

### Tension 4: visionary message versus enterprise buying reality

Customers do not initially buy a future economy thesis. They buy safety, control, and traceability.

---

## 15. What Success Looks Like in 12 Months

In 12 months, success should look like this:

- a clear legal and governance structure exists
- MAS-facing sandbox package is credible and reviewable
- one bounded Singapore use case works end to end
- every transaction has an immutable decision record
- finance and compliance operators can supervise the system confidently
- at least a small number of pilot customers use it in live but bounded conditions
- our roadmap to dual-rail and regional expansion remains technically credible without compromising Phase 1

If we achieve that, we will have built something much more important than a demo: we will have built the first trustworthy operating layer for enterprise agentic commerce.

---

## 16. Immediate Team Priorities

1. Align all internal and external docs around **Phase 1 = Singapore, SGD-first, bounded enterprise sandbox**.
2. Finish the architectural gap between current implementation and the dual-rail future story, especially the remaining Wave B work.
3. Keep Capability Delegation, Decision Record, and Provider Adapter as the launch-critical governance checklist.
4. Treat regulatory evidence generation as part of product development, not as a post-hoc documentation exercise.
5. Build around one end-to-end operational truth: **agent action -> policy -> risk -> settlement -> ledger -> decision record -> review**.

---

## Closing Principle

We are not trying to prove that agents can act financially without constraints.

We are trying to prove that agents can act financially **within clearer constraints, stronger evidence, and better operational control than legacy human workflows**.

That is the product. That is the regulatory argument. That is the GTM wedge.
