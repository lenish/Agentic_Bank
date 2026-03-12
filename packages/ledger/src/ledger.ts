import {
  AccountStatus,
  InMemoryLedgerStore,
  type CurrencyCode,
  SUPPORTED_CURRENCY,
} from "./schema";

export interface LedgerPair {
  debit: string;
  credit: string;
  amount: number;
  currency: CurrencyCode;
  transactionId?: string;
  createdAt?: Date;
  metadata?: Record<string, string>;
}

const assertPositiveIntegerAmount = (amount: number) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Amount must be a positive integer in SGD cents");
  }
};

const assertSupportedCurrency = (currency: string) => {
  if (currency !== SUPPORTED_CURRENCY) {
    throw new Error(`Unsupported currency ${currency}; only SGD is allowed`);
  }
};

export class LedgerService {
  public constructor(private readonly store: InMemoryLedgerStore) {}

  public async createEntry(
    debit: string,
    credit: string,
    amount: number,
    currency: CurrencyCode,
    options?: {
      transactionId?: string;
      createdAt?: Date;
      metadata?: Record<string, string>;
    },
  ) {
    return this.createTransfer({ debit, credit, amount, currency, ...options });
  }

  public async createTransfer(input: LedgerPair) {
    return this.store.runSerializable(async () => {
      if (input.debit === input.credit) {
        throw new Error("Debit and credit accounts must be different");
      }

      assertPositiveIntegerAmount(input.amount);
      assertSupportedCurrency(input.currency);

      const debitAccount = this.store.getAccount(input.debit);
      const creditAccount = this.store.getAccount(input.credit);

      if (!debitAccount || !creditAccount) {
        throw new Error("Both debit and credit accounts must exist");
      }

      if (
        debitAccount.status === AccountStatus.FROZEN ||
        creditAccount.status === AccountStatus.FROZEN
      ) {
        throw new Error("Frozen accounts cannot post ledger entries");
      }

      const transactionId = input.transactionId ?? crypto.randomUUID();
      const createdAt = input.createdAt ?? new Date();
      const metadata = input.metadata ? { ...input.metadata } : undefined;

      const entries = this.store.appendLedgerEntries([
        {
          transactionId,
          accountId: input.debit,
          amountCents: -input.amount,
          currency: input.currency,
          createdAt,
          metadata,
        },
        {
          transactionId,
          accountId: input.credit,
          amountCents: input.amount,
          currency: input.currency,
          createdAt,
          metadata,
        },
      ]);

      const net = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
      if (net !== 0) {
        throw new Error("Double-entry invariant violation: transaction net != 0");
      }

      return {
        transactionId,
        entries,
      };
    });
  }

  public async createCompensatingEntry(
    originalTransactionId: string,
    options?: {
      transactionId?: string;
      createdAt?: Date;
      reason?: string;
    },
  ) {
    return this.store.runSerializable(async () => {
      const originalEntries = this.store.listLedgerEntriesByTransaction(
        originalTransactionId,
      );

      if (originalEntries.length !== 2) {
        throw new Error("Compensating entries require exactly two original entries");
      }

      const [first, second] = originalEntries;
      const transactionId = options?.transactionId ?? crypto.randomUUID();
      const createdAt = options?.createdAt ?? new Date();

      const compensating = this.store.appendLedgerEntries([
        {
          transactionId,
          accountId: first.accountId,
          amountCents: -first.amountCents,
          currency: first.currency,
          createdAt,
          metadata: {
            compensation_of: originalTransactionId,
            reason: options?.reason ?? "correction",
          },
        },
        {
          transactionId,
          accountId: second.accountId,
          amountCents: -second.amountCents,
          currency: second.currency,
          createdAt,
          metadata: {
            compensation_of: originalTransactionId,
            reason: options?.reason ?? "correction",
          },
        },
      ]);

      const net = compensating.reduce((sum, entry) => sum + entry.amountCents, 0);
      if (net !== 0) {
        throw new Error("Compensating transaction net must be zero");
      }

      return {
        transactionId,
        entries: compensating,
      };
    });
  }

  public getBalance(accountId: string): number {
    return this.store
      .listLedgerEntries()
      .filter((entry) => entry.accountId === accountId)
      .reduce((sum, entry) => sum + entry.amountCents, 0);
  }

  public getBalanceAt(accountId: string, asOf: Date): number {
    const limit = asOf.getTime();
    return this.store
      .listLedgerEntries()
      .filter(
        (entry) =>
          entry.accountId === accountId && entry.createdAt.getTime() <= limit,
      )
      .reduce((sum, entry) => sum + entry.amountCents, 0);
  }

  public getTrialBalance(): number {
    return this.store
      .listLedgerEntries()
      .reduce((sum, entry) => sum + entry.amountCents, 0);
  }

  public rejectDirectUpdate(): never {
    return this.store.unsafeUpdateLedgerEntryAmount();
  }
}
