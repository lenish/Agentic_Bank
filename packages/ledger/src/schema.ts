export const SUPPORTED_CURRENCY = "SGD" as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCY;

export enum AccountType {
  USER_ACCOUNT = "user_account",
  AGENT_ACCOUNT = "agent_account",
  ESCROW_ACCOUNT = "escrow_account",
  FEE_ACCOUNT = "fee_account",
}

export enum AccountStatus {
  ACTIVE = "active",
  FROZEN = "frozen",
}

export interface AccountRecord {
  id: string;
  type: AccountType;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntryRecord {
  id: string;
  transactionId: string;
  accountId: string;
  amountCents: number;
  currency: CurrencyCode;
  createdAt: Date;
  metadata?: Record<string, string>;
}

export interface CreateLedgerEntryInput {
  transactionId: string;
  accountId: string;
  amountCents: number;
  currency: CurrencyCode;
  createdAt: Date;
  metadata?: Record<string, string>;
}

export const ledgerSchemaSql = `
CREATE TYPE account_type AS ENUM (
  'user_account',
  'agent_account',
  'escrow_account',
  'fee_account'
);

CREATE TYPE account_status AS ENUM (
  'active',
  'frozen'
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY,
  type account_type NOT NULL,
  status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'SGD'),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_cents <> 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created
  ON ledger_entries(account_id, created_at);

CREATE OR REPLACE FUNCTION prevent_ledger_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only; use compensating entry';
END;
$$;

DROP TRIGGER IF EXISTS ledger_entries_no_update_delete ON ledger_entries;

CREATE TRIGGER ledger_entries_no_update_delete
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update_delete();
`;

const cloneMetadata = (metadata?: Record<string, string>) => {
  if (!metadata) {
    return undefined;
  }

  return { ...metadata };
};

export class InMemoryLedgerStore {
  // TODO: Replace with PostgreSQL-backed repository when infra is available.
  private readonly accounts = new Map<string, AccountRecord>();

  private readonly entries: LedgerEntryRecord[] = [];

  private serializableQueue = Promise.resolve();

  public async runSerializable<T>(work: () => Promise<T>): Promise<T> {
    const execute = async () => work();
    const pending = this.serializableQueue.then(execute, execute);
    this.serializableQueue = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
  }

  public createAccount(input: {
    id: string;
    type: AccountType;
    createdAt: Date;
  }): AccountRecord {
    const now = new Date(input.createdAt);
    const account: AccountRecord = {
      id: input.id,
      type: input.type,
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(account.id, account);
    return { ...account };
  }

  public getAccount(accountId: string): AccountRecord | undefined {
    const account = this.accounts.get(accountId);
    return account ? { ...account } : undefined;
  }

  public setAccountStatus(
    accountId: string,
    status: AccountStatus,
    updatedAt: Date,
  ): AccountRecord {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const next: AccountRecord = {
      ...account,
      status,
      updatedAt: new Date(updatedAt),
    };

    this.accounts.set(accountId, next);
    return { ...next };
  }

  public appendLedgerEntries(
    entries: CreateLedgerEntryInput[],
  ): LedgerEntryRecord[] {
    const created: LedgerEntryRecord[] = entries.map((entry) => {
      const record: LedgerEntryRecord = {
        id: crypto.randomUUID(),
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        amountCents: entry.amountCents,
        currency: entry.currency,
        createdAt: new Date(entry.createdAt),
        metadata: cloneMetadata(entry.metadata),
      };

      this.entries.push(record);
      return { ...record, metadata: cloneMetadata(record.metadata) };
    });

    return created;
  }

  public listLedgerEntries(): LedgerEntryRecord[] {
    return this.entries.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      metadata: cloneMetadata(entry.metadata),
    }));
  }

  public listLedgerEntriesByTransaction(
    transactionId: string,
  ): LedgerEntryRecord[] {
    return this.entries
      .filter((entry) => entry.transactionId === transactionId)
      .map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        metadata: cloneMetadata(entry.metadata),
      }));
  }

  public unsafeUpdateLedgerEntryAmount(): never {
    throw new Error(
      "Direct ledger UPDATE is blocked; create compensating entries instead",
    );
  }
}
