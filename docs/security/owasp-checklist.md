# OWASP API Security Top 10 — Agentic Bank Checklist

**Reference**: OWASP API Security Top 10 2023  
**Date**: 2026-03-12

| # | Risk | Status | Implementation | Notes |
|---|---|---|---|---|
| API1 | Broken Object Level Authorization (BOLA) | ✅ PASS | Capability tokens bound to `agent_id` + `counterparty_scope`. Cross-agent access blocked at middleware. | `packages/api-gateway/src/middleware/capability.ts` |
| API2 | Broken Authentication | ✅ PASS | JWT Bearer token required on all `/api/*` routes. 401 on missing/invalid. 1-hour TTL on SVID tokens. | `packages/api-gateway/src/middleware/auth.ts` |
| API3 | Broken Object Property Level Authorization | ✅ PASS | Role-based data masking: OPERATOR sees masked PII, AUDITOR/ADMIN see full data. | `packages/compliance/src/privacy.ts` |
| API4 | Unrestricted Resource Consumption | ✅ PASS | Sliding window rate limiter: 100 req/min per agent. 429 on exceeded. | `packages/api-gateway/src/middleware/rate-limit.ts` |
| API5 | Broken Function Level Authorization | ✅ PASS | Capability tokens specify allowed `action_set`. Actions outside set → blocked. Deny-by-default policy engine. | `packages/kya/src/capability.ts`, `packages/policy/src/engine.ts` |
| API6 | Unrestricted Access to Sensitive Business Flows | ✅ PASS | Payment pipeline requires: valid auth + valid capability + policy approval + risk check. All gates must pass. | `packages/api-gateway/src/pipeline.ts` |
| API7 | Server Side Request Forgery (SSRF) | ✅ PASS | No user-controlled URLs in server-side requests. SGD rail adapter uses fixed sandbox endpoint. | `packages/settlement/src/sgd-rail.ts` |
| API8 | Security Misconfiguration | ✅ PASS | `.env.tpl` uses `op://` references only. No debug endpoints in production routes. Health check returns minimal info. | `.env.tpl`, `packages/api-gateway/src/gateway.ts` |
| API9 | Improper Inventory Management | ✅ PASS | OpenAPI 3.1 spec (`openapi.yaml`) documents all endpoints. No undocumented shadow APIs. | `openapi.yaml` |
| API10 | Unsafe Consumption of APIs | ✅ PASS | SGD rail adapter validates all responses. Travel Rule adapter validates IVMS101 schema before processing. | `packages/settlement/src/sgd-rail.ts`, `packages/compliance/src/travel-rule.ts` |

## Summary

**All 10 OWASP API Security risks: PASS**

The Agentic Bank API demonstrates strong security posture across all OWASP Top 10 categories. The multi-layer defense (auth → capability → policy → risk → settlement) ensures that no single control failure can lead to unauthorized financial activity.

## Phase 2 Improvements

| Item | Priority | Description |
|---|---|---|
| mTLS for agent-to-service communication | HIGH | Replace JWT with mutual TLS using SPIFFE/SPIRE |
| HSM integration for signing keys | HIGH | Replace in-memory key store with hardware security module |
| PostgreSQL row-level security | MEDIUM | Replace in-memory stores with DB-enforced access control |
| API versioning strategy | LOW | Explicit deprecation policy for API versions |
