export interface PaymentRequest {
  payment_id: string;
  agent_id: string;
  capability_id: string;
  amount_sgd_cents: number;
  counterparty_id: string;
  action: string;
  idempotency_key: string;
}

export interface PipelineStage {
  name: string;
  status: "DONE" | "ERROR";
  elapsed_ms: number;
}

export interface PaymentResult {
  payment_id: string;
  status: "SETTLED" | "HELD" | "FAILED";
  decision_id: string;
  risk_score: number;
  reason_codes: string[];
  elapsed_ms: number;
  pipeline_stages: PipelineStage[];
}

export interface PaymentPipelineContext {
  svid: string;
  policy_id?: string;
  sender_account?: string;
  receiver_account?: string;
}

interface KyaService {
  verify(svid: string): { sub: string };
}

interface CapabilityService {
  verify(input: {
    capability_id: string;
    action: string;
    amount_sgd_cents: number;
    counterparty_id: string;
    actor?: string;
    metadata?: Record<string, unknown>;
  }): unknown;
}

interface PolicyService {
  evaluate(
    policyId: string,
    input: {
      agent_id: string;
      action_type: string;
      amount_sgd_cents: number;
      counterparty_id: string;
      occurred_at?: Date;
      trace_id?: string;
      metadata?: Record<string, unknown>;
    },
  ): {
    allowed: boolean;
    policy_version: string | null;
    reason_codes: string[];
  };
}

interface RiskService {
  evaluate(input: {
    agent_id: string;
    amount_sgd_cents: number;
    counterparty_id: string;
    action: string;
    timestamp: Date;
    request_id: string;
  }): {
    risk_score: number;
    decision: "ALLOW" | "HOLD" | "BLOCK";
    reason_codes: string[];
  };
}

interface SettlementStateService {
  initiate(paymentId: string): unknown;
  transition(
    paymentId: string,
    from: string,
    to: string,
    metadata?: Record<string, unknown>,
  ): unknown;
}

interface SettlementRailService {
  submit(payment: {
    payment_id: string;
    amount_sgd_cents: number;
    sender_account: string;
    receiver_account: string;
    reference?: string;
  }): Promise<{ reference_id: string; status: "PENDING" | "FAILED"; reason?: string }>;
  confirm(
    referenceId: string,
  ): Promise<{ reference_id: string; status: "SETTLED" | "FAILED"; reason?: string }>;
}

interface IdempotencyService {
  has(key: string): boolean;
  get(key: string): { response: unknown } | undefined;
  set(
    key: string,
    record: {
      key: string;
      response: unknown;
      created_at: Date;
      status: "PENDING" | "COMPLETE";
    },
  ): void;
}

interface SettlementService {
  stateMachine: SettlementStateService;
  rail: SettlementRailService;
  idempotencyStore: IdempotencyService;
}

interface LedgerService {
  createEntry(
    debit: string,
    credit: string,
    amount: number,
    currency: "SGD",
    options?: {
      transactionId?: string;
      createdAt?: Date;
      metadata?: Record<string, string>;
    },
  ): Promise<unknown>;
}

interface ComplianceService {
  append(input: {
    trace_id: string;
    agent_id: string;
    input_snapshot: Record<string, unknown>;
    policy_version: string;
    model_version?: string | null;
    reason_codes: string[];
    outcome: "APPROVED" | "REJECTED" | "HELD";
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export interface PaymentPipelineServices {
  kya: KyaService;
  capability: CapabilityService;
  policy: PolicyService;
  risk: RiskService;
  settlement: SettlementService;
  ledger: LedgerService;
  compliance: ComplianceService;
}

const DEFAULT_POLICY_ID = "default-policy";
const UNKNOWN_DECISION_ID = "decision-unavailable";

function nowMs(): number {
  return performance.now();
}

function extractErrorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "PIPELINE_STAGE_FAILED";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPaymentResult(value: unknown): value is PaymentResult {
  if (!isRecord(value)) {
    return false;
  }

  const status = value.status;
  if (status !== "SETTLED" && status !== "HELD" && status !== "FAILED") {
    return false;
  }

  return (
    typeof value.payment_id === "string" &&
    typeof value.decision_id === "string" &&
    typeof value.risk_score === "number" &&
    Array.isArray(value.reason_codes) &&
    typeof value.elapsed_ms === "number" &&
    Array.isArray(value.pipeline_stages)
  );
}

export class PaymentPipeline {
  public constructor(private readonly services: PaymentPipelineServices) {}

  public async execute(request: PaymentRequest, context: PaymentPipelineContext): Promise<PaymentResult> {
    const pipelineStartedAt = nowMs();
    const stages: PipelineStage[] = [];
    let policyVersion = "unknown";
    let riskScore = 0;
    let reasonCodes: string[] = [];

    const cached = this.getIdempotentResult(request.idempotency_key);
    if (cached) {
      return cached;
    }

    try {
      await this.runStage(stages, "KYA Verify", async () => {
        const claims = this.services.kya.verify(context.svid);
        if (claims.sub !== request.agent_id) {
          throw new Error("KYA_AGENT_MISMATCH");
        }
      });

      await this.runStage(stages, "Capability Check", async () => {
        this.services.capability.verify({
          capability_id: request.capability_id,
          action: request.action,
          amount_sgd_cents: request.amount_sgd_cents,
          counterparty_id: request.counterparty_id,
          actor: request.agent_id,
          metadata: { payment_id: request.payment_id },
        });
      });

      const policyEval = await this.runStage(stages, "Policy Eval", async () =>
        this.services.policy.evaluate(context.policy_id ?? DEFAULT_POLICY_ID, {
          agent_id: request.agent_id,
          action_type: request.action,
          amount_sgd_cents: request.amount_sgd_cents,
          counterparty_id: request.counterparty_id,
          occurred_at: new Date(),
          trace_id: request.payment_id,
          metadata: { capability_id: request.capability_id },
        }),
      );

      policyVersion = policyEval.policy_version ?? "unknown";
      if (!policyEval.allowed) {
        reasonCodes = policyEval.reason_codes;
        return this.finalizeWithDecision({
          request,
          context,
          status: "FAILED",
          riskScore,
          reasonCodes,
          policyVersion,
          stages,
          pipelineStartedAt,
        });
      }

      const riskEval = await this.runStage(stages, "Risk Score", async () =>
        this.services.risk.evaluate({
          agent_id: request.agent_id,
          amount_sgd_cents: request.amount_sgd_cents,
          counterparty_id: request.counterparty_id,
          action: request.action,
          timestamp: new Date(),
          request_id: request.payment_id,
        }),
      );

      riskScore = riskEval.risk_score;
      reasonCodes = riskEval.reason_codes;

      if (riskEval.decision === "BLOCK") {
        return this.finalizeWithDecision({
          request,
          context,
          status: "FAILED",
          riskScore,
          reasonCodes,
          policyVersion,
          stages,
          pipelineStartedAt,
        });
      }

      if (riskEval.decision === "HOLD") {
        return this.finalizeWithDecision({
          request,
          context,
          status: "HELD",
          riskScore,
          reasonCodes,
          policyVersion,
          stages,
          pipelineStartedAt,
        });
      }

      await this.runStage(stages, "Settlement Execute", async () => {
        this.services.settlement.stateMachine.initiate(request.payment_id);
        this.services.settlement.stateMachine.transition(
          request.payment_id,
          "INITIATED",
          "AUTHORIZED",
          { action: "authorize" },
        );

        const submit = await this.services.settlement.rail.submit({
          payment_id: request.payment_id,
          amount_sgd_cents: request.amount_sgd_cents,
          sender_account: context.sender_account ?? request.agent_id,
          receiver_account: context.receiver_account ?? request.counterparty_id,
          reference: request.idempotency_key,
        });

        if (submit.status !== "PENDING") {
          throw new Error(submit.reason ?? "SETTLEMENT_SUBMIT_FAILED");
        }

        this.services.settlement.stateMachine.transition(
          request.payment_id,
          "AUTHORIZED",
          "RELEASING",
          { reference_id: submit.reference_id },
        );

        const confirmation = await this.services.settlement.rail.confirm(submit.reference_id);
        if (confirmation.status !== "SETTLED") {
          throw new Error(confirmation.reason ?? "SETTLEMENT_CONFIRM_FAILED");
        }

        this.services.settlement.stateMachine.transition(
          request.payment_id,
          "RELEASING",
          "SETTLED",
          { reference_id: submit.reference_id },
        );
      });

      await this.runStage(stages, "Ledger Update", async () => {
        await this.services.ledger.createEntry(
          request.agent_id,
          request.counterparty_id,
          request.amount_sgd_cents,
          "SGD",
          {
            transactionId: request.payment_id,
            metadata: {
              payment_id: request.payment_id,
              idempotency_key: request.idempotency_key,
            },
          },
        );
      });

      return this.finalizeWithDecision({
        request,
        context,
        status: "SETTLED",
        riskScore,
        reasonCodes,
        policyVersion,
        stages,
        pipelineStartedAt,
      });
    } catch (error) {
      const stageErrorCode = extractErrorCode(error);
      const mergedReasons = [...reasonCodes, stageErrorCode];
      if (!stages.some((stage) => stage.name === "Decision Record")) {
        const recorded = await this.recordDecision(
          stages,
          request,
          context,
          "FAILED",
          riskScore,
          mergedReasons,
          policyVersion,
        );
        const failedResult: PaymentResult = {
          payment_id: request.payment_id,
          status: "FAILED",
          decision_id: recorded.decisionId,
          risk_score: riskScore,
          reason_codes: mergedReasons,
          elapsed_ms: Math.round(nowMs() - pipelineStartedAt),
          pipeline_stages: [...stages],
        };
        this.persistIdempotentResult(request.idempotency_key, failedResult);
        return failedResult;
      }

      const failedResult: PaymentResult = {
        payment_id: request.payment_id,
        status: "FAILED",
        decision_id: UNKNOWN_DECISION_ID,
        risk_score: riskScore,
        reason_codes: mergedReasons,
        elapsed_ms: Math.round(nowMs() - pipelineStartedAt),
        pipeline_stages: [...stages],
      };
      this.persistIdempotentResult(request.idempotency_key, failedResult);
      return failedResult;
    }
  }

  private getIdempotentResult(key: string): PaymentResult | null {
    if (!this.services.settlement.idempotencyStore.has(key)) {
      return null;
    }

    const cached = this.services.settlement.idempotencyStore.get(key);
    if (!cached) {
      return null;
    }

    return isPaymentResult(cached.response) ? cached.response : null;
  }

  private persistIdempotentResult(key: string, result: PaymentResult): void {
    if (this.services.settlement.idempotencyStore.has(key)) {
      return;
    }

    this.services.settlement.idempotencyStore.set(key, {
      key,
      response: result,
      created_at: new Date(),
      status: "COMPLETE",
    });
  }

  private async finalizeWithDecision(input: {
    request: PaymentRequest;
    context: PaymentPipelineContext;
    status: "SETTLED" | "HELD" | "FAILED";
    riskScore: number;
    reasonCodes: string[];
    policyVersion: string;
    stages: PipelineStage[];
    pipelineStartedAt: number;
  }): Promise<PaymentResult> {
    const recorded = await this.recordDecision(
      input.stages,
      input.request,
      input.context,
      input.status,
      input.riskScore,
      input.reasonCodes,
      input.policyVersion,
    );

    const result: PaymentResult = {
      payment_id: input.request.payment_id,
      status: input.status,
      decision_id: recorded.decisionId,
      risk_score: input.riskScore,
      reason_codes: input.reasonCodes,
      elapsed_ms: Math.round(nowMs() - input.pipelineStartedAt),
      pipeline_stages: [...input.stages],
    };
    this.persistIdempotentResult(input.request.idempotency_key, result);
    return result;
  }

  private async recordDecision(
    stages: PipelineStage[],
    request: PaymentRequest,
    context: PaymentPipelineContext,
    status: "SETTLED" | "HELD" | "FAILED",
    riskScore: number,
    reasonCodes: string[],
    policyVersion: string,
  ): Promise<{ decisionId: string }> {
    try {
      const record = await this.runStage(stages, "Decision Record", async () =>
        this.services.compliance.append({
          trace_id: request.payment_id,
          agent_id: request.agent_id,
          input_snapshot: {
            request,
            context,
            risk_score: riskScore,
          },
          policy_version: policyVersion,
          model_version: null,
          reason_codes: reasonCodes,
          outcome: status === "SETTLED" ? "APPROVED" : status === "HELD" ? "HELD" : "REJECTED",
          metadata: {
            payment_status: status,
            stage_count: stages.length,
          },
        }),
      );

      return { decisionId: record.id };
    } catch {
      return { decisionId: UNKNOWN_DECISION_ID };
    }
  }

  private async runStage<T>(
    stages: PipelineStage[],
    name: string,
    handler: () => Promise<T> | T,
  ): Promise<T> {
    const startedAt = nowMs();
    try {
      const output = await handler();
      stages.push({
        name,
        status: "DONE",
        elapsed_ms: Math.round(nowMs() - startedAt),
      });
      return output;
    } catch (error) {
      stages.push({
        name,
        status: "ERROR",
        elapsed_ms: Math.round(nowMs() - startedAt),
      });
      throw error;
    }
  }
}
