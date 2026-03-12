const STEP_UP_AMOUNT_THRESHOLD = 10_000_00;

const HIGH_RISK_ACTIONS = new Set<string>([
  "HIGH_RISK_ACTION",
  "HIGH_RISK_TRANSFER",
  "WITHDRAWAL",
  "LARGE_SETTLEMENT",
]);

export class StepUpAuth {
  requiresStepUp(action: string, amount: number, isNewCounterparty: boolean): boolean {
    if (amount > STEP_UP_AMOUNT_THRESHOLD) {
      return true;
    }

    if (isNewCounterparty) {
      return true;
    }

    return HIGH_RISK_ACTIONS.has(action);
  }
}

export { STEP_UP_AMOUNT_THRESHOLD };
