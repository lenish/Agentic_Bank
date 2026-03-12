import { describe, expect, test } from "bun:test";

import { AgentWalletService } from "./wallet";
import {
  AccountService,
  AccountType,
  InMemoryLedgerStore,
  LedgerService,
  SUPPORTED_CURRENCY,
} from "./index";

const setup = () => {
  const store = new InMemoryLedgerStore();
  const accounts = new AccountService(store);
  const ledger = new LedgerService(store);
  const wallet = new AgentWalletService(accounts, ledger, store);
  const master = accounts.createAccount(AccountType.USER_ACCOUNT);

  return { store, accounts, ledger, wallet, master };
};

describe("AgentWalletService", () => {
  test("createSubAccount creates sub-account with correct metadata", () => {
    const { wallet, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "marketing",
      200_000,
    );

    expect(sub.agentId).toBe("agent-1");
    expect(sub.masterAccountId).toBe(master.id);
    expect(sub.purpose).toBe("marketing");
    expect(sub.limitSgdCents).toBe(200_000);
    expect(sub.accountId).toBeTruthy();
  });

  test("allocateFunds moves funds from master to sub-account", async () => {
    const { wallet, ledger, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "ops",
      500_000,
    );
    const tx = await wallet.allocateFunds(master.id, sub.accountId, 100_000);

    expect(tx.entries).toHaveLength(2);
    expect(ledger.getBalance(sub.accountId)).toBe(100_000);
    expect(ledger.getBalance(master.id)).toBe(-100_000);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("allocateFunds rejects when allocation would exceed limit", async () => {
    const { wallet, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "ops",
      200_000,
    );
    await wallet.allocateFunds(master.id, sub.accountId, 200_000);

    expect(
      wallet.allocateFunds(master.id, sub.accountId, 1),
    ).rejects.toThrow("Allocation would exceed sub-account limit");
  });

  test("recallFunds moves funds from sub-account back to master", async () => {
    const { wallet, ledger, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "ops",
      500_000,
    );
    await wallet.allocateFunds(master.id, sub.accountId, 200_000);
    await wallet.recallFunds(sub.accountId, master.id, 80_000);

    expect(ledger.getBalance(sub.accountId)).toBe(120_000);
    expect(ledger.getBalance(master.id)).toBe(-120_000);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("spendFromSubAccount creates ledger entry with purpose metadata", async () => {
    const { wallet, accounts, ledger, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "procurement",
      500_000,
    );
    await wallet.allocateFunds(master.id, sub.accountId, 300_000);

    const vendor = accounts.createAccount(AccountType.USER_ACCOUNT);
    const tx = await wallet.spendFromSubAccount(
      sub.accountId,
      vendor.id,
      100_000,
      "office supplies",
    );

    expect(tx.entries).toHaveLength(2);
    expect(ledger.getBalance(sub.accountId)).toBe(200_000);
    expect(ledger.getBalance(vendor.id)).toBe(100_000);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("freezeSubAccount blocks spend and allocation", async () => {
    const { wallet, accounts, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "ops",
      500_000,
    );
    await wallet.allocateFunds(master.id, sub.accountId, 200_000);

    wallet.freezeSubAccount(sub.accountId);

    const vendor = accounts.createAccount(AccountType.USER_ACCOUNT);
    expect(
      wallet.spendFromSubAccount(sub.accountId, vendor.id, 50_000, "test"),
    ).rejects.toThrow("Sub-account is frozen");

    expect(
      wallet.allocateFunds(master.id, sub.accountId, 50_000),
    ).rejects.toThrow("Sub-account is frozen");
  });

  test("unfreezeSubAccount re-enables operations", async () => {
    const { wallet, accounts, ledger, master } = setup();

    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "ops",
      500_000,
    );
    await wallet.allocateFunds(master.id, sub.accountId, 200_000);

    wallet.freezeSubAccount(sub.accountId);
    wallet.unfreezeSubAccount(sub.accountId);

    const vendor = accounts.createAccount(AccountType.USER_ACCOUNT);
    await wallet.spendFromSubAccount(sub.accountId, vendor.id, 50_000, "test");

    expect(ledger.getBalance(sub.accountId)).toBe(150_000);
  });

  test("getSubAccountsByAgent returns only matching agent sub-accounts", () => {
    const { wallet, master } = setup();

    wallet.createSubAccount("agent-1", master.id, "marketing", 100_000);
    wallet.createSubAccount("agent-1", master.id, "ops", 200_000);
    wallet.createSubAccount("agent-2", master.id, "ops", 300_000);

    const agent1Subs = wallet.getSubAccountsByAgent("agent-1");
    expect(agent1Subs).toHaveLength(2);

    const agent2Subs = wallet.getSubAccountsByAgent("agent-2");
    expect(agent2Subs).toHaveLength(1);
    expect(agent2Subs[0].purpose).toBe("ops");
  });

  test("getSubAccountsByPurpose returns only matching purpose sub-accounts", () => {
    const { wallet, master } = setup();

    wallet.createSubAccount("agent-1", master.id, "marketing", 100_000);
    wallet.createSubAccount("agent-2", master.id, "marketing", 200_000);
    wallet.createSubAccount("agent-3", master.id, "ops", 300_000);

    const marketingSubs = wallet.getSubAccountsByPurpose("marketing");
    expect(marketingSubs).toHaveLength(2);

    const opsSubs = wallet.getSubAccountsByPurpose("ops");
    expect(opsSubs).toHaveLength(1);
    expect(opsSubs[0].agentId).toBe("agent-3");
  });

  test("QA scenario: full lifecycle with limit enforcement and ledger verification", async () => {
    const { wallet, accounts, ledger, master } = setup();

    // Step 1: Fund master account (10,000 SGD = 1,000,000 cents)
    const funding = accounts.createAccount(AccountType.ESCROW_ACCOUNT);
    await ledger.createEntry(
      funding.id,
      master.id,
      1_000_000,
      SUPPORTED_CURRENCY,
    );
    expect(ledger.getBalance(master.id)).toBe(1_000_000);

    // Step 2: Create agent sub-account (limit: 2,000 SGD = 200,000 cents)
    const sub = wallet.createSubAccount(
      "agent-1",
      master.id,
      "procurement",
      200_000,
    );

    // Step 3: Allocate 2,000 SGD → success
    await wallet.allocateFunds(master.id, sub.accountId, 200_000);
    expect(ledger.getBalance(sub.accountId)).toBe(200_000);
    expect(ledger.getBalance(master.id)).toBe(800_000);

    // Step 4: Allocate additional 500 SGD → limit exceeded
    expect(
      wallet.allocateFunds(master.id, sub.accountId, 50_000),
    ).rejects.toThrow("Allocation would exceed sub-account limit");

    // Step 5: Spend 1,000 SGD from sub-account → ledger entry verified
    const vendor = accounts.createAccount(AccountType.USER_ACCOUNT);
    const spendTx = await wallet.spendFromSubAccount(
      sub.accountId,
      vendor.id,
      100_000,
      "office supplies",
    );

    expect(spendTx.entries).toHaveLength(2);
    expect(ledger.getBalance(sub.accountId)).toBe(100_000);
    expect(ledger.getBalance(vendor.id)).toBe(100_000);
    expect(ledger.getTrialBalance()).toBe(0);
  });
});
