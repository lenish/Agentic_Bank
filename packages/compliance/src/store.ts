// TODO: Replace with PostgreSQL append-only table with INSERT-only row-level security in production
// The production store should use:
//   - INSERT-only permissions (no UPDATE, no DELETE)
//   - Row-level security policies enforcing immutability
//   - Partitioned by created_at for efficient time-range queries
//   - Indexed on trace_id, agent_id, outcome, created_at

import type { DecisionRecord } from "./schema";

/**
 * In-memory append-only store for DecisionRecords.
 * Write-once semantics: once a record is stored, it cannot be modified or deleted.
 *
 * This interface deliberately exposes NO update or delete methods.
 */
export interface DecisionStore {
  /** Append a record. Throws if id already exists. */
  append(record: DecisionRecord): void;
  /** Get a single record by its id. */
  getById(id: string): DecisionRecord | undefined;
  /** Get all records (for query filtering). */
  getAll(): ReadonlyArray<DecisionRecord>;
}

/**
 * Creates an in-memory append-only store.
 * The returned object has NO mutation methods beyond append.
 */
export function createDecisionStore(): DecisionStore {
  const records = new Map<string, DecisionRecord>();

  return {
    append(record: DecisionRecord): void {
      if (records.has(record.id)) {
        throw new Error(
          `DecisionRecord with id "${record.id}" already exists. Records are immutable.`
        );
      }
      // Freeze the record to prevent in-memory mutation
      records.set(record.id, Object.freeze({ ...record }));
    },

    getById(id: string): DecisionRecord | undefined {
      return records.get(id);
    },

    getAll(): ReadonlyArray<DecisionRecord> {
      return Array.from(records.values());
    },
  };
}
