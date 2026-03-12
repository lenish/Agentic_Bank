export interface SgdPayment {
  payment_id: string;
  amount_sgd_cents: number;
  sender_account: string;
  receiver_account: string;
  reference?: string;
}

export interface RailSubmitResult {
  reference_id: string;
  status: "PENDING";
}

export interface RailConfirmResult {
  reference_id: string;
  status: "SETTLED";
  settled_at: Date;
}

export interface RailRefundResult {
  reference_id: string;
  status: "REFUNDED";
  refunded_at: Date;
}

export interface RailFailureResult {
  reference_id: string;
  status: "FAILED";
  reason: string;
}

export interface RailAdapter {
  submit(payment: SgdPayment): Promise<RailSubmitResult | RailFailureResult>;
  confirm(referenceId: string): Promise<RailConfirmResult | RailFailureResult>;
  refund(referenceId: string): Promise<RailRefundResult | RailFailureResult>;
}

export class SgdRailAdapter implements RailAdapter {
  // TODO: Replace sandbox simulator with MAS-regulated FAST/PayNow API integration.
  private readonly submissions = new Map<
    string,
    { payment: SgdPayment; status: "PENDING" | "SETTLED" | "REFUNDED" }
  >();

  private readonly successRate: number;

  public constructor(options?: { successRate?: number }) {
    this.successRate = options?.successRate ?? 0.95;
  }

  async submit(payment: SgdPayment): Promise<RailSubmitResult | RailFailureResult> {
    this.assertPayment(payment);

    const referenceId = `SGD-${crypto.randomUUID()}`;

    if (!this.simulateSuccess()) {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "SANDBOX_RANDOM_FAILURE",
      };
    }

    this.submissions.set(referenceId, { payment, status: "PENDING" });

    return {
      reference_id: referenceId,
      status: "PENDING",
    };
  }

  async confirm(referenceId: string): Promise<RailConfirmResult | RailFailureResult> {
    this.assertReferenceId(referenceId);

    const submission = this.submissions.get(referenceId);
    if (!submission) {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "SUBMISSION_NOT_FOUND",
      };
    }

    if (submission.status !== "PENDING") {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: `INVALID_STATUS_FOR_CONFIRM: ${submission.status}`,
      };
    }

    if (!this.simulateSuccess()) {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "SANDBOX_RANDOM_FAILURE",
      };
    }

    submission.status = "SETTLED";

    return {
      reference_id: referenceId,
      status: "SETTLED",
      settled_at: new Date(),
    };
  }

  async refund(referenceId: string): Promise<RailRefundResult | RailFailureResult> {
    this.assertReferenceId(referenceId);

    const submission = this.submissions.get(referenceId);
    if (!submission) {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "SUBMISSION_NOT_FOUND",
      };
    }

    if (submission.status === "REFUNDED") {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "ALREADY_REFUNDED",
      };
    }

    if (!this.simulateSuccess()) {
      return {
        reference_id: referenceId,
        status: "FAILED",
        reason: "SANDBOX_RANDOM_FAILURE",
      };
    }

    submission.status = "REFUNDED";

    return {
      reference_id: referenceId,
      status: "REFUNDED",
      refunded_at: new Date(),
    };
  }

  private simulateSuccess(): boolean {
    return Math.random() < this.successRate;
  }

  private assertPayment(payment: SgdPayment): void {
    if (!payment.payment_id.trim()) {
      throw new Error("PAYMENT_ID_REQUIRED");
    }

    if (!Number.isInteger(payment.amount_sgd_cents) || payment.amount_sgd_cents <= 0) {
      throw new Error("AMOUNT_INVALID");
    }

    if (!payment.sender_account.trim()) {
      throw new Error("SENDER_ACCOUNT_REQUIRED");
    }

    if (!payment.receiver_account.trim()) {
      throw new Error("RECEIVER_ACCOUNT_REQUIRED");
    }
  }

  private assertReferenceId(referenceId: string): void {
    if (!referenceId.trim()) {
      throw new Error("REFERENCE_ID_REQUIRED");
    }
  }
}
