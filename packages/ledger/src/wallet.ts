import { AccountService } from "./account";
import { LedgerService } from "./ledger";
import {
  AccountStatus,
  AccountType,
  InMemoryLedgerStore,
  SUPPORTED_CURRENCY,
} from "./schema";

export interface SubAccountRecord {
  accountId: string;
  agentId: string;
  masterAccountId: string;
  purpose: string;
  limitSgdCents: number;
}

export class AgentWalletService {
  // TODO: Replace with PostgreSQL-backed store when infra is available.
  private readonly subAccounts = new Map<string, SubAccountRecord>();

  public constructor(
    private readonly accountService: AccountService,
    private readonly ledgerService: LedgerService,
    private readonly store: InMemoryLedgerStore,
  ) {}

  /**
   * Create a purpose-bound sub-account for an AI agent, linked to a master account.
   */
  public createSubAccount(
    agentId: string,
    masterAccountId: string,
    purpose: string,
    limitSgdCents: number,
  ): SubAccountRecord {
    const master = this.store.getAccount(masterAccountId);
    if (!master) {
      throw new Error("Master account not found");
    }

    if (!agentId.trim()) {
      throw new Error("Agent ID is required");
    }

    if (!purpose.trim()) {
      throw new Error("Purpose is required");
    }

    if (!Number.isInteger(limitSgdCents) || limitSgdCents <= 0) {
      throw new Error("Limit must be a positive integer in SGD cents");
    }

    const account = this.accountService.createAccount(AccountType.AGENT_ACCOUNT);

    const subAccount: SubAccountRecord = {
      accountId: account.id,
      agentId,
      masterAccountId,
      purpose,
      limitSgdCents,
    };

    this.subAccounts.set(account.id, subAccount);
    return { ...subAccount };
  }

  /**
   * Move funds from master account → sub-account.
   * Rejects if allocation would exceed the sub-account's limitSgdCents.
   */
  public async allocateFunds(
    masterAccountId: string,
    subAccountId: string,
    amountSgdCents: number,
  ) {
    const sub = this.requireSubAccount(subAccountId);

    if (sub.masterAccountId !== masterAccountId) {
      throw new Error("Master account does not own this sub-account");
    }

    this.assertNotFrozen(subAccountId);

    const currentBalance = this.ledgerService.getBalance(subAccountId);
    if (currentBalance + amountSgdCents > sub.limitSgdCents) {
      throw new Error("Allocation would exceed sub-account limit");
    }

    return this.ledgerService.createEntry(
      masterAccountId,
      subAccountId,
      amountSgdCents,
      SUPPORTED_CURRENCY,
      {
        metadata: { type: "allocation", purpose: sub.purpose },
      },
    );
  }

  /**
   * Move funds from sub-account → master account (recall).
   */
  public async recallFunds(
    subAccountId: string,
    masterAccountId: string,
    amountSgdCents: number,
  ) {
    const sub = this.requireSubAccount(subAccountId);

    if (sub.masterAccountId !== masterAccountId) {
      throw new Error("Master account does not own this sub-account");
    }

    return this.ledgerService.createEntry(
      subAccountId,
      masterAccountId,
      amountSgdCents,
      SUPPORTED_CURRENCY,
      {
        metadata: { type: "recall", purpose: sub.purpose },
      },
    );
  }

  /**
   * Spend from sub-account to a counterparty account.
   * Blocked if sub-account is frozen.
   */
  public async spendFromSubAccount(
    subAccountId: string,
    counterpartyAccountId: string,
    amountSgdCents: number,
    purpose: string,
  ) {
    this.requireSubAccount(subAccountId);
    this.assertNotFrozen(subAccountId);

    return this.ledgerService.createEntry(
      subAccountId,
      counterpartyAccountId,
      amountSgdCents,
      SUPPORTED_CURRENCY,
      {
        metadata: { type: "spend", purpose },
      },
    );
  }

  /**
   * List all sub-accounts belonging to a specific agent.
   */
  public getSubAccountsByAgent(agentId: string): SubAccountRecord[] {
    const results: SubAccountRecord[] = [];
    for (const sub of this.subAccounts.values()) {
      if (sub.agentId === agentId) {
        results.push({ ...sub });
      }
    }
    return results;
  }

  /**
   * List all sub-accounts tagged with a specific purpose.
   */
  public getSubAccountsByPurpose(purpose: string): SubAccountRecord[] {
    const results: SubAccountRecord[] = [];
    for (const sub of this.subAccounts.values()) {
      if (sub.purpose === purpose) {
        results.push({ ...sub });
      }
    }
    return results;
  }

  /**
   * Freeze a sub-account — blocks spend and allocation.
   */
  public freezeSubAccount(subAccountId: string): SubAccountRecord {
    const sub = this.requireSubAccount(subAccountId);
    this.accountService.freezeAccount(subAccountId);
    return { ...sub };
  }

  /**
   * Unfreeze a sub-account — re-enables spend and allocation.
   */
  public unfreezeSubAccount(subAccountId: string): SubAccountRecord {
    const sub = this.requireSubAccount(subAccountId);
    this.accountService.unfreezeAccount(subAccountId);
    return { ...sub };
  }

  private requireSubAccount(subAccountId: string): SubAccountRecord {
    const sub = this.subAccounts.get(subAccountId);
    if (!sub) {
      throw new Error("Sub-account not found");
    }
    return sub;
  }

  private assertNotFrozen(subAccountId: string): void {
    const account = this.store.getAccount(subAccountId);
    if (account?.status === AccountStatus.FROZEN) {
      throw new Error("Sub-account is frozen");
    }
  }
}
