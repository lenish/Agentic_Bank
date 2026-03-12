export type IdempotencyStatus = "PENDING" | "COMPLETE";

export interface IdempotencyRecord {
  key: string;
  response: unknown;
  created_at: Date;
  status: IdempotencyStatus;
}

export class IdempotencyStore {
  // TODO: Replace in-memory store with Redis for multi-instance consistency.
  private readonly records = new Map<string, IdempotencyRecord>();

  set(key: string, response: IdempotencyRecord): void {
    this.assertKey(key);
    if (this.records.has(key)) {
      throw new Error("IDEMPOTENCY_KEY_ALREADY_EXISTS");
    }

    if (response.key !== key) {
      throw new Error("IDEMPOTENCY_KEY_MISMATCH");
    }

    this.records.set(key, this.cloneRecord(response));
  }

  get(key: string): IdempotencyRecord | undefined {
    this.assertKey(key);

    const record = this.records.get(key);
    if (!record) {
      return undefined;
    }

    return this.cloneRecord(record);
  }

  has(key: string): boolean {
    this.assertKey(key);
    return this.records.has(key);
  }

  reap(maxAgeMs: number): number {
    if (!Number.isInteger(maxAgeMs) || maxAgeMs < 0) {
      throw new Error("IDEMPOTENCY_REAP_MAX_AGE_INVALID");
    }

    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [key, record] of this.records.entries()) {
      if (record.created_at.getTime() > cutoff) {
        continue;
      }

      this.records.delete(key);
      removed += 1;
    }

    return removed;
  }

  private assertKey(key: string): void {
    if (!key.trim()) {
      throw new Error("IDEMPOTENCY_KEY_REQUIRED");
    }
  }

  private cloneRecord(record: IdempotencyRecord): IdempotencyRecord {
    return {
      ...record,
      created_at: new Date(record.created_at.getTime()),
    };
  }
}
