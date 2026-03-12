import {
  AccountStatus,
  AccountType,
  InMemoryLedgerStore,
  type AccountRecord,
} from "./schema";

export class AccountService {
  public constructor(private readonly store: InMemoryLedgerStore) {}

  public createAccount(type: AccountType): AccountRecord {
    const now = new Date();
    return this.store.createAccount({
      id: crypto.randomUUID(),
      type,
      createdAt: now,
    });
  }

  public freezeAccount(id: string): AccountRecord {
    return this.store.setAccountStatus(id, AccountStatus.FROZEN, new Date());
  }

  public unfreezeAccount(id: string): AccountRecord {
    return this.store.setAccountStatus(id, AccountStatus.ACTIVE, new Date());
  }
}

export { AccountStatus, AccountType };
