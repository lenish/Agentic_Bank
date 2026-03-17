# Agentic_Bank Internal Executive Summary (2-Page)

**Status**: Internal Use Only  
**Date**: March 2026  
**Audience**: SCV/Hashed/Execution Core Team

---

## Page 1 — Strategic Thesis, Scope, and Phase 1 Focus

### 1) Executive Thesis

Agentic_Bank의 본질은 "에이전트를 위한 은행"이 아니라, **에이전트가 기존 금융 인프라를 안전하게 사용하게 만드는 통제 계층(control layer)** 이다.  
우리가 해결하는 문제는 결제 기능 부족이 아니라, autonomous action의 **권한 경계, 사전 정책 집행, 실시간 리스크 통제, 사후 책임 추적** 부재다.

핵심 한 줄:

> We do not replace banks. We make agentic financial execution controllable, auditable, and operationally safe.

### 2) Why Now

- 기업 내 AI agent 도입이 빠르게 증가하고 있음
- 기존 카드/API key 기반 구조는 bounded autonomy에 부적합
- 규제기관/리스크팀 관점에서 "누가 위임했고 왜 허용됐는지"에 대한 증빙 요구가 커짐
- SC Ventures와 Hashed의 조합으로 규제/유통/생태계 레버리지를 동시에 확보 가능

### 3) What We Build (AOA)

AOA(Agent Operating Account)는 다음 3가지를 launch-critical로 고정한다:

1. **Capability Delegation**: 인증과 위임을 분리하고 액션/금액/TTL/대상 범위를 강제
2. **Decision Record Plane**: 모든 승인/거절/보류/오버라이드를 immutable하게 기록
3. **Provider Adapter Pattern**: rail/vendor 변경 시에도 통제/증빙 포맷 일관성 유지

이 3가지는 제품 기능이 아니라 **규제/운영 생존요건**이다.

### 4) Phase 1 Product Scope (Non-Negotiable)

Phase 1은 expansion이 아니라 proof 단계다.

- Singapore only
- MAS sandbox pathway
- SGD-only, single primary rail
- bounded transaction and customer cohort
- narrow action allowlist

Phase 1의 목적:

- "기능이 많다"를 증명하는 것이 아니라,
- "통제가 일관되고 안전하게 운영 가능하다"를 증명하는 것.

### 5) Operating Model (Who Owns What)

- **SC Ventures**: regulatory interface, enterprise distribution, stage-gate governance
- **Hashed**: blockchain/stablecoin ecosystem strategy (Phase 2 중심)
- **Execution Team**: product, engineering, reliability, control implementation, evidence generation

운영 원칙:

> The owner of the risk decision must own the escalation path.

---

## Page 2 — Execution Plan, Regulatory Path, GTM, and KPI Gates

### 6) Build Sequence

**Wave 1 (Foundation)**
- legal/governance baseline
- KYA, capability, ledger, decision record

**Wave 2 (Bounded Execution)**
- policy, risk, idempotency+saga, settlement state machine, API/messenger

**Wave B (Dual-Rail Preparation)**
- rail abstraction, stablecoin skeleton, signing port, async finality, multi-asset prep

**Wave 3 (Compliance + Operator Trust)**
- AML, Travel Rule, dispute, reconciliation, dashboard, privacy controls

**Wave 4 (Launch Readiness)**
- MAS evidence package, security audit, pilot onboarding, performance/SLO, pricing

### 7) Phase Gates (Go / No-Go)

**Gate A: Foundation -> Bounded Execution**
- delegation enforcement pass
- decision record coverage near-complete
- ledger invariants hold under failure/replay
- revocation and kill-switch tested

**Gate B: Bounded Execution -> Sandbox Launch**
- one E2E payment path consistently stable
- reconciliation break rate within threshold
- AML/dispute/operator flows operational
- launch evidence artifacts complete and current

**Gate C: Sandbox Proof -> Dual-Rail Expansion**
- Phase 1 controls stable on real traffic
- no unresolved material control failures
- pilot customers validate control-plane value
- rail expansion justified by demand, not roadmap pressure

### 8) Regulatory Strategy

- 핵심 메시지: "자율성 확대"보다 "통제 가능성 강화"
- licensing은 제품팀 가정이 아니라 법률/규제 트랙과 분리 관리
- control layer는 external legal obligations를 대체하지 않으며, evidence generation을 통해 규제 대응을 용이하게 함

### 9) GTM Strategy

초기 웨지는 "AI banking"이 아니라 다음이다:

**Safe agent spend and settlement infrastructure for enterprises**

초기 ICP:
- 반복 결제/재무 workflow를 가진 enterprise
- sandboxed pilot 수용 가능 조직
- auditability 가치를 즉시 이해하는 리스크/재무팀

시장 순서:
1) design partners  
2) bounded pilots  
3) referenceable case studies  
4) controlled expansion

### 10) KPI Dashboard (Leadership)

**Control Quality**
- decision record coverage
- delegation validation rate
- override correctness

**Money Movement Reliability**
- settlement success rate
- reconciliation break rate
- rollback success rate

**Compliance & Ops**
- AML alert SLA
- incident MTTR
- kill-switch drill pass rate

**Commercial**
- pilot conversion
- active enterprise accounts
- free-to-paid expansion

### 11) Top Risks and Mitigations

- **Risk 1: Scope creep before control maturity** -> enforce phase gates and launch-critical checklist
- **Risk 2: External narrative outruns product truth** -> claim-evidence review before external comms
- **Risk 3: Rail expansion too early** -> keep dual-rail as Phase 2 unless Gate C is met
- **Risk 4: Blurred ownership** -> DRI + decision rights matrix with explicit escalation rules

### 12) 90-Day Internal Priorities

1. 문서/메시지 통일: 8-layer reference + Phase 1 SGD-first
2. 남은 Wave B 핵심 항목 정리 및 우선순위 확정
3. launch-critical controls 점검표를 weekly operating ritual로 고정
4. sandbox evidence generation을 개발 파이프라인에 내장
5. 단일 E2E 시나리오에서 운영 안정성/증빙 완결성 확보

---

## Closing

우리가 증명해야 하는 것은 "agents can pay"가 아니다.  
우리가 증명해야 하는 것은 **"agents can be governed"** 이다.
