import type { OutboxService } from "./outbox";

export interface SagaStep {
  name: string;
  execute: () => Promise<unknown>;
  compensate: () => Promise<void>;
}

export interface SagaResult {
  sagaId: string;
  status: "COMPLETED" | "COMPENSATED" | "FAILED";
  completed_steps: string[];
  failed_step?: string;
  compensation_errors: string[];
}

export class SagaOrchestrator {
  public constructor(private readonly outbox: OutboxService) {}

  async execute(sagaId: string, steps: SagaStep[]): Promise<SagaResult> {
    if (!sagaId.trim()) {
      throw new Error("SAGA_ID_REQUIRED");
    }

    const completedSteps: SagaStep[] = [];
    const completedStepNames: string[] = [];

    for (const step of steps) {
      this.publishSagaEvent(sagaId, "SAGA_STEP_EXECUTING", { step: step.name });

      try {
        const output = await step.execute();
        completedSteps.push(step);
        completedStepNames.push(step.name);
        this.publishSagaEvent(sagaId, "SAGA_STEP_COMPLETED", { step: step.name, output });
      } catch (error: unknown) {
        this.publishSagaEvent(sagaId, "SAGA_STEP_FAILED", {
          step: step.name,
          error: this.errorMessage(error),
        });

        const compensationErrors = await this.compensate(sagaId, completedSteps);
        const status = compensationErrors.length === 0 ? "COMPENSATED" : "FAILED";

        return {
          sagaId,
          status,
          completed_steps: completedStepNames,
          failed_step: step.name,
          compensation_errors: compensationErrors,
        };
      }
    }

    return {
      sagaId,
      status: "COMPLETED",
      completed_steps: completedStepNames,
      compensation_errors: [],
    };
  }

  private async compensate(sagaId: string, completedSteps: SagaStep[]): Promise<string[]> {
    const errors: string[] = [];

    for (let index = completedSteps.length - 1; index >= 0; index -= 1) {
      const step = completedSteps[index];
      if (!step) {
        continue;
      }

      this.publishSagaEvent(sagaId, "SAGA_COMPENSATE_EXECUTING", { step: step.name });

      try {
        await step.compensate();
        this.publishSagaEvent(sagaId, "SAGA_COMPENSATE_COMPLETED", { step: step.name });
      } catch (error: unknown) {
        const errorMessage = this.errorMessage(error);
        errors.push(`${step.name}:${errorMessage}`);
        this.publishSagaEvent(sagaId, "SAGA_COMPENSATE_FAILED", {
          step: step.name,
          error: errorMessage,
        });
      }
    }

    return errors;
  }

  private publishSagaEvent(sagaId: string, eventType: string, payload: unknown): void {
    this.outbox.publish({
      id: crypto.randomUUID(),
      event_type: eventType,
      payload: {
        saga_id: sagaId,
        ...((typeof payload === "object" && payload !== null ? payload : { value: payload }) as object),
      },
      created_at: new Date(),
      processed: false,
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return "UNKNOWN_ERROR";
  }
}
