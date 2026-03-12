export enum TransactionStatus {
  INITIATED = "INITIATED",
  AUTHORIZED = "AUTHORIZED",
  HELD = "HELD",
  RELEASING = "RELEASING",
  SETTLED = "SETTLED",
  REFUNDED = "REFUNDED",
  DISPUTED = "DISPUTED",
}

const allowedTransitions: Record<TransactionStatus, readonly TransactionStatus[]> = {
  [TransactionStatus.INITIATED]: [TransactionStatus.AUTHORIZED],
  [TransactionStatus.AUTHORIZED]: [TransactionStatus.HELD],
  [TransactionStatus.HELD]: [TransactionStatus.RELEASING, TransactionStatus.DISPUTED],
  [TransactionStatus.RELEASING]: [
    TransactionStatus.SETTLED,
    TransactionStatus.REFUNDED,
  ],
  [TransactionStatus.SETTLED]: [],
  [TransactionStatus.REFUNDED]: [],
  [TransactionStatus.DISPUTED]: [TransactionStatus.REFUNDED],
};

export class InvalidStateTransitionError extends Error {
  public constructor(from: TransactionStatus, to: TransactionStatus) {
    super(`Invalid transaction state transition ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class TransactionStateMachine {
  public canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    return allowedTransitions[from].includes(to);
  }

  public transition(
    from: TransactionStatus,
    to: TransactionStatus,
  ): TransactionStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to);
    }

    return to;
  }
}
