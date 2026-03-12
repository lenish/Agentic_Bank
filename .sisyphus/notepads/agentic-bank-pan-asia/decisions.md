# Decisions — agentic-bank-pan-asia

## [2026-03-12] Architecture Decisions (from Oracle review)
- Entity structure: Zodia model (separate legal entity, SCV ~90% equity)
- Identity: SPIFFE+OAuth mTLS for Phase 1 (VC/DID deferred to Phase 2)
- Policy engine: OPA or Cedar (deny-by-default)
- Signing: AWS KMS or HashiCorp Vault Transit (MPC deferred to Phase 2)
- Settlement rail: SGD only in Phase 1 (multi-currency deferred)
- AML: Osprey for Phase 1 (Tazama full stack deferred to Phase 2)
- Monorepo: Turborepo (per T3 spec)
- Runtime: TypeScript/Bun primary, pytest for Python model serving
- DB: PostgreSQL SERIALIZABLE isolation for ledger
- Cache/Queue: Redis + Kafka
