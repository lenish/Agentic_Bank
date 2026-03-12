# MAS FinTech Regulatory Sandbox — Application Requirements Analysis

**Status**: For Planning Purposes Only — Not Legal Advice | **Date**: March 2026
**Disclaimer**: This document is prepared for internal planning and alignment. It does not constitute legal advice. Formal legal counsel must review before any MAS submission.
**Reference**: [MAS FinTech Regulatory Sandbox](https://www.mas.gov.sg/development/fintech/regulatory-sandbox) | [Payment Services Act 2019](https://www.mas.gov.sg/regulation/acts/payment-services-act)

---

## 1. Overview: MAS FinTech Regulatory Sandbox

The MAS FinTech Regulatory Sandbox allows financial institutions and fintech players to experiment with innovative financial products or services in a live environment, with appropriate safeguards, for a defined period. MAS may relax specific legal and regulatory requirements during the sandbox period.

### 1.1 Sandbox Variants

| Sandbox Type | Description | Fit for AOA |
|-------------|-------------|-------------|
| **Regulatory Sandbox** | Full sandbox with bespoke relaxations; MAS evaluates on case-by-case basis | ✅ Primary target |
| **Sandbox Express** | Pre-defined parameters for specific activities (insurance, remittances) | ⚠️ Possible for domestic transfers, but limited scope |

**Recommendation**: Apply for the full **Regulatory Sandbox** (not Sandbox Express) given AOA's novel agentic account model, which does not fit neatly into Sandbox Express pre-defined categories.

---

## 2. Eligibility Criteria Analysis

MAS evaluates sandbox applications against the following criteria. Analysis of AOA's fit below:

### 2.1 Core Eligibility Requirements

| # | MAS Criterion | AOA Assessment | Readiness |
|---|--------------|----------------|-----------|
| 1 | **Genuine innovation**: The fintech solution must be genuinely novel or represent significant improvement | ✅ **Strong** — Agent Operating Accounts (machine-native financial accounts with capability delegation, bounded tokens, decision audit trails) is a novel financial primitive with no direct equivalent in market | Ready |
| 2 | **Benefit to consumers or industry**: Must address a gap or problem in the financial ecosystem | ✅ **Strong** — Enables autonomous agent commerce with institutional-grade compliance; reduces friction for B2B AI-agent financial operations | Ready |
| 3 | **Intent to deploy in Singapore**: Applicant must intend to deploy the solution in Singapore after sandbox | ✅ **Strong** — Singapore is Phase 1 market (SGD domestic transfers); Pte. Ltd. entity to be incorporated | Ready |
| 4 | **Tested within controlled boundaries**: Solution must be testable in a bounded environment | ✅ **Strong** — Phase 1 is inherently bounded: SGD-only, domestic transfers, limited pilot customers, capped transaction values | Ready |
| 5 | **Clear exit/transition plan**: Applicant must have a plan to exit sandbox (either full compliance or orderly wind-down) | ⚠️ **Needs Prep** — Must document: (a) path to SPI license post-sandbox, or (b) orderly wind-down procedures including customer fund return | Needs Work |
| 6 | **Adequate risk management**: Appropriate safeguards for consumers and financial system | ⚠️ **Needs Prep** — Must demonstrate: AML/CFT controls, transaction monitoring, agent authorization framework, fund safeguarding | Needs Work |

### 2.2 Additional Evaluation Factors

| Factor | AOA Position |
|--------|-------------|
| **Applicant's track record** | SC Ventures is an established innovation arm of Standard Chartered; Zodia, Libeara are precedents |
| **Technology maturity** | MVP-ready; monorepo scaffold in place; core packages defined |
| **Regulatory awareness** | Team demonstrates understanding of PSA requirements (this document set) |
| **Financial resources** | SC Ventures backing provides confidence in financial viability |

---

## 3. Required Submission Documents Checklist

Based on MAS sandbox guidelines and precedent applications:

### 3.1 Application Form & Cover Letter

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 1 | **Sandbox Application Form** | MAS prescribed form (available on MAS website) | ☐ Not started |
| 2 | **Cover Letter** | Executive summary addressed to FinTech & Innovation Group, MAS | ☐ Not started |
| 3 | **Board Resolution** | Board approval to apply for MAS sandbox | ☐ Pending entity incorporation |

### 3.2 Business & Innovation Description

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 4 | **Detailed Business Plan** | Product description, target market, revenue model, 3-year financial projections | ☐ Not started |
| 5 | **Innovation Statement** | What is genuinely novel about AOA; how it differs from existing payment solutions | ☐ Not started |
| 6 | **Market Analysis** | Competitive landscape, addressable market, Singapore-specific opportunity | ☐ Not started |
| 7 | **Customer Impact Assessment** | Benefits to end-users; risk to consumers; consumer protection measures | ☐ Not started |

### 3.3 Technical Documentation

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 8 | **System Architecture Document** | Technical architecture, data flows, API specifications | ☐ In progress (T3 scaffold) |
| 9 | **Technology Risk Assessment** | Per MAS TRM Guidelines; cyber security, data protection, system resilience | ☐ Not started |
| 10 | **Data Protection Impact Assessment** | PDPA compliance; cross-border data transfer assessment | ☐ Not started |
| 11 | **Penetration Test Report** | Independent security assessment (can be submitted during sandbox) | ☐ Deferred to sandbox period |

### 3.4 Regulatory & Compliance

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 12 | **AML/CFT Framework** | Anti-money laundering policies, KYC procedures, transaction monitoring, STR filing | ☐ Not started |
| 13 | **Compliance Programme** | Compliance officer appointment, training, ongoing monitoring | ☐ Not started |
| 14 | **Fit & Proper Declarations** | Background checks for directors and key personnel | ☐ Pending appointments |
| 15 | **Outsourcing Risk Assessment** | If using third-party services (cloud hosting, payment rails) | ☐ Not started |

### 3.5 Sandbox-Specific

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 16 | **Sandbox Boundary Proposal** | Proposed parameters: customer count cap, transaction limits, duration | ☐ Not started |
| 17 | **Exit / Transition Plan** | Path to full PSA SPI license OR orderly wind-down plan | ☐ Not started |
| 18 | **Progress Reporting Framework** | Proposed KPIs and reporting cadence to MAS during sandbox | ☐ Not started |
| 19 | **Customer Communication Plan** | How sandbox participants (customers) will be informed of sandbox status and risks | ☐ Not started |

---

## 4. Timeline Estimate

### 4.1 Pre-Application Phase

| Step | Duration | Dependencies |
|------|----------|-------------|
| Entity incorporation (ACRA) | 3-6 weeks | Name approval, KYC documents |
| Legal counsel engagement | 1-2 weeks | Select from Legal Partners shortlist |
| Document preparation | 6-8 weeks | Business plan, technical docs, compliance framework |
| MAS pre-application consultation | 2-4 weeks | Optional but strongly recommended; informal dialogue with MAS FinTech & Innovation Group |
| **Pre-application total** | **~3-4 months** | |

### 4.2 Application & Review Phase

| Step | Duration | Notes |
|------|----------|-------|
| Formal application submission | 1 week | Submit via MAS portal with all documents |
| MAS initial review | 2-4 weeks | MAS may request additional information |
| Clarification rounds | 2-6 weeks | Iterative Q&A with MAS; typically 1-3 rounds |
| MAS assessment & decision | 4-8 weeks | Internal MAS review committee |
| **Application total** | **~3-5 months** | |

### 4.3 Sandbox Period

| Step | Duration | Notes |
|------|----------|-------|
| Sandbox onboarding | 2-4 weeks | Technical readiness, compliance setup, MAS briefing |
| **Sandbox operation period** | **9-12 months** | Standard MAS sandbox duration |
| Mid-point review | At ~6 months | MAS progress assessment; may adjust boundaries |
| Exit assessment | Final 2-3 months | Demonstrate compliance readiness for full license |
| **Sandbox total** | **~12 months** | May be extended by MAS on case-by-case basis |

### 4.4 End-to-End Timeline Summary

```
Month 0-1     Entity incorporation (ACRA)
Month 1-4     Document preparation + MAS pre-consultation
Month 4-5     Formal sandbox application submission
Month 5-9     MAS review + clarification rounds
Month 9-10    Sandbox approval + onboarding
Month 10-22   Sandbox operation (12 months)
Month 20-22   Exit assessment + SPI license application
Month 22-28   Full SPI license approval
              ─────────────────────────────────────────
              Total: ~24-28 months from initiation to full license
```

---

## 5. Key Conditions & Restrictions During Sandbox Period

Based on MAS sandbox guidelines and precedent sandbox entrants:

### 5.1 Standard MAS Sandbox Conditions

| # | Condition | Implication for AOA |
|---|-----------|---------------------|
| 1 | **Customer cap**: Limited number of customers allowed | Expect 50-200 pilot customers max during sandbox |
| 2 | **Transaction limits**: Individual and aggregate caps | Per-transaction limit (e.g., S$5,000); daily aggregate (e.g., S$200,000) |
| 3 | **Geographic restriction**: Singapore only | Aligns with Phase 1 scope (SGD domestic) |
| 4 | **Product scope restriction**: Only approved services | Only domestic money transfer + account issuance; no DPT/FX |
| 5 | **Reporting obligations**: Regular reporting to MAS | Monthly or quarterly progress reports; incident reporting |
| 6 | **Customer disclosure**: Clear communication of sandbox status | All customers must acknowledge they are participating in a sandbox product |
| 7 | **Fund safeguarding**: Even in sandbox, customer funds must be protected | Trust account or equivalent arrangement required |
| 8 | **Exit readiness**: Must be prepared to wind down if sandbox exit criteria not met | Orderly wind-down plan must be executable at any time |

### 5.2 Specific Restrictions for AOA (Anticipated)

Given AOA's novel agentic account model, MAS may impose additional conditions:

| Restriction | Rationale | Our Approach |
|-------------|-----------|--------------|
| **Agent authorization audit trail** | Ensure human oversight of agent financial decisions | Decision Record Plane (per Operating Charter §7) |
| **Capability delegation bounds** | Limit what agents can do autonomously | Bounded tokens with per-transaction and daily limits |
| **Human override mechanism** | Require ability to halt agent operations | Kill-switch in policy engine; human approval for >threshold amounts |
| **Agent identity verification** | KYA (Know Your Agent) requirements | KYA package (per monorepo architecture) |
| **Explainability** | Ability to explain why agent made a financial decision | Decision audit log with reasoning trace |

### 5.3 Reporting Requirements During Sandbox

| Report | Frequency | Content |
|--------|-----------|---------|
| **Progress Report** | Monthly | Transaction volumes, customer count, incidents, KPIs |
| **Incident Report** | Ad-hoc (within 24hrs) | Security breaches, system failures, compliance violations |
| **Financial Report** | Quarterly | Revenue, costs, capital adequacy, fund safeguarding status |
| **Mid-Point Review** | At 6 months | Comprehensive assessment against sandbox objectives |
| **Exit Report** | Final month | Full compliance readiness assessment, license application status |

---

## 6. Precedent Analysis

### 6.1 Relevant Sandbox Participants

| Company | MAS Sandbox Entry | Activity | Outcome | Relevance to AOA |
|---------|-------------------|----------|---------|-------------------|
| **Libeara** (SC Ventures) | HKMA sandbox (similar model) | Tokenised money market fund | Active | SCV entity; demonstrates SCV's sandbox experience |
| **Grab Financial** | MAS sandbox → Full MPI | Digital payments, lending | Graduated to full license | Proves MAS sandbox-to-license pipeline works |
| **Nium** | MAS-licensed | Cross-border payments | Full MPI license | B2B payments infrastructure; similar positioning |
| **Aspire** | MAS sandbox → SPI | SME neobanking | Graduated to SPI | Similar scale at entry; SPI was sufficient |

### 6.2 Key Lessons from Precedents

1. **Pre-consultation matters**: Applicants who engaged MAS informally before formal submission had shorter review cycles.
2. **SC Ventures name carries weight**: MAS is familiar with SCV's innovation programme; Zodia and Libeara precedents help.
3. **Start narrow, expand later**: Successful sandbox applicants proposed narrow scope initially, then expanded.
4. **Technology documentation is critical**: MAS places heavy emphasis on technology risk management; invest in TRM documentation early.

---

## 7. Immediate Next Steps

| # | Action | Owner | Timeline | Dependency |
|---|--------|-------|----------|------------|
| 1 | Engage legal counsel (see Legal Partners shortlist) | Delivery Lead | Week 1 | None |
| 2 | Initiate ACRA incorporation | Legal Counsel | Week 2-6 | Legal engagement |
| 3 | Draft sandbox boundary proposal | Delivery Lead + Legal | Week 4-8 | Entity structure finalised |
| 4 | Prepare AML/CFT framework draft | Compliance (outsourced) | Week 4-10 | Legal engagement |
| 5 | MAS pre-application consultation request | SCV Venture Lead | Week 6-8 | Entity incorporated |
| 6 | Technology Risk Management document | Execution Team | Week 6-12 | Architecture finalised |
| 7 | Formal sandbox application submission | SCV + Legal | Month 4-5 | All documents ready |

---

*Cross-references: [Entity Structure](./entity-structure.md) | [Legal Partners](./legal-partners-shortlist.md) | [Operating Charter](../governance/operating-charter.md)*
