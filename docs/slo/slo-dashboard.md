# SLO Dashboard Design

## Objective
Provide a production-facing view of latency, availability, and error budget health for `@aoa/api-gateway`, with explicit visibility into payment pipeline behavior.

## Dashboard Layout

## Row 1: Executive Health
- Uptime (30d): target `> 99.9%`
- Error budget remaining (30d): percentage and minutes
- Active incidents: count by severity

## Row 2: Latency SLO Panels
- API latency (`/health`, core API aggregate): p50/p95/p99, target line at `200ms`
- Payment latency (`POST /api/v1/payments`): p50/p95/p99, target line at `500ms`
- Heatmap: latency distribution by minute for spike identification

## Row 3: Reliability and Degradation
- HTTP status ratio over time: `2xx`, `4xx`, `5xx`
- `503` count with `Retry-After` coverage rate
- Downstream dependency status panel (risk/policy/settlement adapters)

## Row 4: Burn Rate and Alerts
- 1h/6h/24h burn-rate charts
- Alert thresholds: `14x` (page), `6x` (urgent), `3x` (ticket)
- Annotation layer: deploys, rollbacks, config changes

## Key Metrics to Emit
- `api_gateway_request_duration_ms` (histogram with route + method labels)
- `api_gateway_request_total` (counter with status code labels)
- `api_gateway_slo_error_budget_remaining` (gauge)
- `api_gateway_downstream_unavailable_total` (counter)
- `api_gateway_retry_after_header_total` (counter)

## Tracking Rules
- Exclude deliberate security rejects (`401`, `403`, `429`) from availability SLI denominator
- Include unexpected `5xx` and timeout failures in SLI error count
- Split payment route dashboards by stage when pipeline telemetry exists

## Operational Actions
- If payment p95 exceeds `500ms` for 15 minutes, auto-enable strict rate limiting for non-critical endpoints
- If API p95 exceeds `200ms` for 15 minutes, trigger traffic profile investigation (auth/capability middleware and payload size)
- If error budget remaining < 25%, shift sprint capacity to reliability work until stable
