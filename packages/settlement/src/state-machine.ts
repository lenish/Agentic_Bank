export enum SettlementStatus {
  INITIATED = "INITIATED",
  AUTHORIZED = "AUTHORIZED",
  HELD = "HELD",
  RELEASING = "RELEASING",
  SETTLED = "SETTLED",
  REFUNDED = "REFUNDED",
  DISPUTED = "DISPUTED",
}

export type EscrowConditionType = "TIME_RELEASE" | "ORACLE_CONFIRM";

export interface EscrowCondition {
  type: EscrowConditionType;
  expiresAt?: Date;
  oracleConfirmed?: boolean;
}

export interface TransitionRecord {
  paymentId: string;
  from: SettlementStatus;
  to: SettlementStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const ALLOWED_TRANSITIONS: Record<SettlementStatus, readonly SettlementStatus[]> = {
  [SettlementStatus.INITIATED]: [SettlementStatus.AUTHORIZED],
  [SettlementStatus.AUTHORIZED]: [SettlementStatus.HELD, SettlementStatus.RELEASING],
  [SettlementStatus.HELD]: [
    SettlementStatus.RELEASING,
    SettlementStatus.REFUNDED,
    SettlementStatus.DISPUTED,
  ],
  [SettlementStatus.RELEASING]: [SettlementStatus.SETTLED, SettlementStatus.REFUNDED],
  [SettlementStatus.SETTLED]: [SettlementStatus.DISPUTED],
  [SettlementStatus.REFUNDED]: [],
  [SettlementStatus.DISPUTED]: [SettlementStatus.REFUNDED, SettlementStatus.SETTLED],
};

export class SettlementStateMachine {
  private readonly states = new Map<string, SettlementStatus>();
  private readonly history = new Map<string, TransitionRecord[]>();
  private readonly escrowConditions = new Map<string, EscrowCondition>();

  getState(paymentId: string): SettlementStatus {
    this.assertPaymentId(paymentId);

    const state = this.states.get(paymentId);
    if (!state) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    return state;
  }

  getHistory(paymentId: string): TransitionRecord[] {
    this.assertPaymentId(paymentId);

    const records = this.history.get(paymentId);
    if (!records) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    return records.map((record) => ({
      ...record,
      timestamp: new Date(record.timestamp.getTime()),
      metadata: record.metadata ? { ...record.metadata } : undefined,
    }));
  }

  initiate(paymentId: string): SettlementStatus {
    this.assertPaymentId(paymentId);

    if (this.states.has(paymentId)) {
      throw new Error("PAYMENT_ALREADY_EXISTS");
    }

    this.states.set(paymentId, SettlementStatus.INITIATED);
    this.history.set(paymentId, [
      {
        paymentId,
        from: SettlementStatus.INITIATED,
        to: SettlementStatus.INITIATED,
        timestamp: new Date(),
        metadata: { action: "initiate" },
      },
    ]);

    return SettlementStatus.INITIATED;
  }

  transition(
    paymentId: string,
    from: SettlementStatus,
    to: SettlementStatus,
    metadata?: Record<string, unknown>,
  ): SettlementStatus {
    this.assertPaymentId(paymentId);

    const currentState = this.states.get(paymentId);
    if (currentState === undefined) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (currentState !== from) {
      throw new Error("STATE_MISMATCH");
    }

    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new Error("INVALID_TRANSITION");
    }

    this.states.set(paymentId, to);

    const records = this.history.get(paymentId);
    if (records) {
      records.push({
        paymentId,
        from,
        to,
        timestamp: new Date(),
        metadata,
      });
    }

    return to;
  }

  canTransition(from: SettlementStatus, to: SettlementStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  holdEscrow(
    paymentId: string,
    conditionType: EscrowConditionType,
    expiresAt?: Date,
  ): SettlementStatus {
    this.assertPaymentId(paymentId);

    const currentState = this.states.get(paymentId);
    if (currentState === undefined) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (conditionType === "TIME_RELEASE" && !expiresAt) {
      throw new Error("ESCROW_EXPIRY_REQUIRED");
    }

    // Must be in AUTHORIZED to hold escrow
    this.transition(paymentId, currentState, SettlementStatus.HELD, {
      action: "hold_escrow",
      condition_type: conditionType,
      expires_at: expiresAt?.toISOString(),
    });

    this.escrowConditions.set(paymentId, {
      type: conditionType,
      expiresAt: expiresAt ? new Date(expiresAt.getTime()) : undefined,
      oracleConfirmed: false,
    });

    return SettlementStatus.HELD;
  }

  confirmOracle(paymentId: string): void {
    this.assertPaymentId(paymentId);

    const condition = this.escrowConditions.get(paymentId);
    if (!condition) {
      throw new Error("ESCROW_NOT_FOUND");
    }

    if (condition.type !== "ORACLE_CONFIRM") {
      throw new Error("ESCROW_NOT_ORACLE_TYPE");
    }

    condition.oracleConfirmed = true;
  }

  releaseEscrow(paymentId: string): SettlementStatus {
    this.assertPaymentId(paymentId);

    const currentState = this.states.get(paymentId);
    if (currentState !== SettlementStatus.HELD) {
      throw new Error("PAYMENT_NOT_HELD");
    }

    const condition = this.escrowConditions.get(paymentId);
    if (!condition) {
      throw new Error("ESCROW_NOT_FOUND");
    }

    if (condition.type === "TIME_RELEASE" && condition.expiresAt) {
      if (new Date() < condition.expiresAt) {
        throw new Error("ESCROW_TIME_NOT_EXPIRED");
      }
    }

    if (condition.type === "ORACLE_CONFIRM" && !condition.oracleConfirmed) {
      throw new Error("ESCROW_ORACLE_NOT_CONFIRMED");
    }

    return this.transition(paymentId, SettlementStatus.HELD, SettlementStatus.RELEASING, {
      action: "release_escrow",
      condition_type: condition.type,
    });
  }

  checkAndAutoRelease(paymentId: string): SettlementStatus | null {
    this.assertPaymentId(paymentId);

    const currentState = this.states.get(paymentId);
    if (currentState !== SettlementStatus.HELD) {
      return null;
    }

    const condition = this.escrowConditions.get(paymentId);
    if (!condition) {
      return null;
    }

    if (condition.type !== "TIME_RELEASE") {
      return null;
    }

    if (!condition.expiresAt || new Date() < condition.expiresAt) {
      return null;
    }

    return this.transition(paymentId, SettlementStatus.HELD, SettlementStatus.RELEASING, {
      action: "auto_release",
      condition_type: "TIME_RELEASE",
    });
  }

  getEscrowCondition(paymentId: string): EscrowCondition | undefined {
    this.assertPaymentId(paymentId);
    const condition = this.escrowConditions.get(paymentId);
    if (!condition) {
      return undefined;
    }

    return {
      ...condition,
      expiresAt: condition.expiresAt ? new Date(condition.expiresAt.getTime()) : undefined,
    };
  }

  private assertPaymentId(paymentId: string): void {
    if (!paymentId.trim()) {
      throw new Error("PAYMENT_ID_REQUIRED");
    }
  }
}
