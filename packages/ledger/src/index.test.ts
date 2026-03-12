import { describe, expect, test } from "bun:test";

import {
  AccountService,
  AccountType,
  InMemoryLedgerStore,
  InvalidStateTransitionError,
  LedgerService,
  SUPPORTED_CURRENCY,
  TransactionStateMachine,
  TransactionStatus,
} from "./index";

const setup = () => {
  const store = new InMemoryLedgerStore();
  const accounts = new AccountService(store);
  const ledger = new LedgerService(store);

  return { store, accounts, ledger };
};

describe("LedgerService", () => {
  test("debit+credit pair creates balanced entries (sum=0)", async () => {
    const { accounts, ledger } = setup();
    const a = accounts.createAccount(AccountType.USER_ACCOUNT);
    const b = accounts.createAccount(AccountType.ESCROW_ACCOUNT);

    const tx = await ledger.createEntry(a.id, b.id, 1_000, SUPPORTED_CURRENCY);
    const net = tx.entries.reduce((sum, entry) => sum + entry.amountCents, 0);

    expect(tx.entries).toHaveLength(2);
    expect(net).toBe(0);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("A→B transfer decrements A, increments B, and trial balance holds", async () => {
    const { accounts, ledger } = setup();
    const a = accounts.createAccount(AccountType.USER_ACCOUNT);
    const b = accounts.createAccount(AccountType.AGENT_ACCOUNT);

    await ledger.createEntry(a.id, b.id, 2_500, SUPPORTED_CURRENCY);

    expect(ledger.getBalance(a.id)).toBe(-2_500);
    expect(ledger.getBalance(b.id)).toBe(2_500);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("direct UPDATE is blocked; use compensating entry", () => {
    const { ledger } = setup();
    expect(() => ledger.rejectDirectUpdate()).toThrow(
      "Direct ledger UPDATE is blocked",
    );
  });

  test("SERIALIZABLE concurrent transfers preserve consistency", async () => {
    const { accounts, ledger, store } = setup();
    const source = accounts.createAccount(AccountType.ESCROW_ACCOUNT);
    const targetA = accounts.createAccount(AccountType.USER_ACCOUNT);
    const targetB = accounts.createAccount(AccountType.FEE_ACCOUNT);

    await Promise.all([
      ledger.createEntry(source.id, targetA.id, 7_000, SUPPORTED_CURRENCY),
      ledger.createEntry(source.id, targetB.id, 3_000, SUPPORTED_CURRENCY),
    ]);

    expect(ledger.getBalance(source.id)).toBe(-10_000);
    expect(ledger.getBalance(targetA.id)).toBe(7_000);
    expect(ledger.getBalance(targetB.id)).toBe(3_000);
    expect(store.listLedgerEntries()).toHaveLength(4);
    expect(ledger.getTrialBalance()).toBe(0);
  });

  test("point-in-time balance query returns historical value", async () => {
    const { accounts, ledger } = setup();
    const a = accounts.createAccount(AccountType.USER_ACCOUNT);
    const b = accounts.createAccount(AccountType.AGENT_ACCOUNT);
    const c = accounts.createAccount(AccountType.FEE_ACCOUNT);

    const t1 = new Date("2026-01-01T00:00:00.000Z");
    const t2 = new Date("2026-01-01T00:01:00.000Z");

    await ledger.createEntry(a.id, b.id, 1_000, SUPPORTED_CURRENCY, {
      createdAt: t1,
    });
    await ledger.createEntry(a.id, c.id, 200, SUPPORTED_CURRENCY, {
      createdAt: t2,
    });

    expect(ledger.getBalanceAt(a.id, new Date("2026-01-01T00:00:30.000Z"))).toBe(
      -1_000,
    );
    expect(ledger.getBalanceAt(a.id, new Date("2026-01-01T00:02:00.000Z"))).toBe(
      -1_200,
    );
  });

  test("compensating entry reverses prior transaction without updates", async () => {
    const { accounts, ledger } = setup();
    const a = accounts.createAccount(AccountType.USER_ACCOUNT);
    const b = accounts.createAccount(AccountType.AGENT_ACCOUNT);

    const original = await ledger.createEntry(a.id, b.id, 1_500, SUPPORTED_CURRENCY);
    await ledger.createCompensatingEntry(original.transactionId, {
      reason: "manual correction",
    });

    expect(ledger.getBalance(a.id)).toBe(0);
    expect(ledger.getBalance(b.id)).toBe(0);
    expect(ledger.getTrialBalance()).toBe(0);
  });
});

describe("TransactionStateMachine", () => {
  test("valid transitions succeed", () => {
    const machine = new TransactionStateMachine();

    let state = TransactionStatus.INITIATED;
    state = machine.transition(state, TransactionStatus.AUTHORIZED);
    state = machine.transition(state, TransactionStatus.HELD);
    state = machine.transition(state, TransactionStatus.RELEASING);
    state = machine.transition(state, TransactionStatus.SETTLED);

    expect(state).toBe(TransactionStatus.SETTLED);
  });

  test("invalid transitions throw", () => {
    const machine = new TransactionStateMachine();

    expect(() =>
      machine.transition(TransactionStatus.INITIATED, TransactionStatus.SETTLED),
    ).toThrow(InvalidStateTransitionError);
  });
});
