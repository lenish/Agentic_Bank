import { randomUUID } from "crypto";
import type {
  DecisionRecord,
  DecisionRecordInput,
  DecisionOutcome,
  DecisionQueryOptions,
} from "./schema";
import type { DecisionStore } from "./store";
import { createDecisionStore } from "./store";

/**
 * Immutable Decision Record Service — the append-only audit plane
 * spanning ALL layers (policy, risk, settlement, dispute).
 *
 * "If it isn't in the decision record, it didn't happen."
 *
 * This service deliberately has NO update() or delete() methods.
 * Immutability is enforced at the service layer, the store layer,
 * and via TypeScript's type system (readonly fields on DecisionRecord).
 */
export class DecisionRecordService {
  private readonly store: DecisionStore;

  constructor(store?: DecisionStore) {
    this.store = store ?? createDecisionStore();
  }

  /**
   * Append an immutable decision record.
   * Multiple records with the same trace_id are allowed —
   * e.g., policy engine AND risk engine both record decisions for the same transaction.
   */
  async append(input: DecisionRecordInput): Promise<DecisionRecord> {
    const record: DecisionRecord = {
      id: randomUUID(),
      trace_id: input.trace_id,
      agent_id: input.agent_id,
      input_snapshot: input.input_snapshot,
      policy_version: input.policy_version,
      model_version: input.model_version ?? null,
      reason_codes: [...input.reason_codes],
      outcome: input.outcome,
      override_actor: input.override_actor ?? null,
      created_at: new Date().toISOString(),
      metadata: input.metadata ? { ...input.metadata } : {},
    };

    this.store.append(record);
    return record;
  }

  /**
   * Get all decision records for a given trace_id.
   * Returns all records linked to the originating request.
   */
  async getByTraceId(traceId: string): Promise<DecisionRecord[]> {
    return this.store
      .getAll()
      .filter((r) => r.trace_id === traceId);
  }

  /**
   * Get decision records by agent_id, optionally filtered by time range.
   */
  async getByAgentId(
    agentId: string,
    options?: DecisionQueryOptions
  ): Promise<DecisionRecord[]> {
    return this.store.getAll().filter((r) => {
      if (r.agent_id !== agentId) return false;
      if (options?.from && new Date(r.created_at) < options.from) return false;
      if (options?.to && new Date(r.created_at) > options.to) return false;
      return true;
    });
  }

  /**
   * Get decision records by outcome, optionally filtered by time range.
   */
  async getByOutcome(
    outcome: DecisionOutcome,
    options?: DecisionQueryOptions
  ): Promise<DecisionRecord[]> {
    return this.store.getAll().filter((r) => {
      if (r.outcome !== outcome) return false;
      if (options?.from && new Date(r.created_at) < options.from) return false;
      if (options?.to && new Date(r.created_at) > options.to) return false;
      return true;
    });
  }
}
