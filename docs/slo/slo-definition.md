# Agentic Bank API SLO Definition

## Scope
- Service: `@aoa/api-gateway` (Hono API edge for auth/capability/payment requests)
- Environment for baseline validation: local in-memory dependencies (no external DB)
- Measurement source: `packages/api-gateway/src/load-test.test.ts` and `packages/api-gateway/src/load-test.ts`

## SLI and SLO Targets

### 1) API Availability
- SLI: successful request ratio on API endpoints (`2xx` and expected `4xx`, excluding synthetic abuse traffic)
- SLO target: `>= 99.9%` rolling 30-day availability
- Error budget: `0.1%` failed requests per 30 days (43.2 minutes total downtime equivalent)

### 2) API Latency (General)
- SLI: request latency percentile for gateway endpoints (including `/health` and auth/capability guarded routes)
- SLO target: `p95 < 200ms`
- Baseline load profile: `100` concurrent, `1000` total requests

### 3) Settlement/Payment Pipeline Latency
- SLI: end-to-end payment execution latency (`POST /api/v1/payments`)
- SLO target: `p95 < 500ms`
- Baseline load profile: `100` concurrent, `1000` total requests

## Error Budget Policy
- Budget window: rolling 30 days
- Freeze policy: when cumulative error budget burn exceeds 100%, feature release is frozen until burn returns to safe range
- Prioritization: incidents affecting payment settlement SLI have higher priority than read-only endpoint degradation

## Burn Rate and Alerting Thresholds
- Fast burn alert (page): 1-hour burn rate `> 14x` budget
  - Action: immediate incident response, rollback or traffic shaping
- Medium burn alert (urgent): 6-hour burn rate `> 6x` budget
  - Action: assign incident commander, disable non-critical workloads
- Slow burn alert (ticket): 24-hour burn rate `> 3x` budget
  - Action: create reliability work item in sprint backlog

## Graceful Degradation Requirement
- If downstream critical dependency is unavailable, gateway must:
  - return `503 Service Unavailable`
  - include `Retry-After` header
  - avoid leaking internal stack traces or provider details

## Review Cadence
- Weekly reliability review: compare observed p95/p99 against SLO baseline
- Monthly governance review: assess error budget burn, tune rate limits and timeout defaults
