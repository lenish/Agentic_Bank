import type { PolicyEngine } from "./engine";
import type {
  PolicyEvalInput,
  PolicyEvalResult,
  PolicyVersion,
  ShadowEvaluationResult,
} from "./schema";

export class ShadowEvaluator {
  private readonly engine: PolicyEngine;

  constructor(engine: PolicyEngine) {
    this.engine = engine;
  }

  async evaluate(
    policyId: string,
    input: PolicyEvalInput,
    candidatePolicyVersion: PolicyVersion
  ): Promise<ShadowEvaluationResult> {
    const [actual, shadow] = await Promise.all([
      Promise.resolve(this.engine.evaluate(policyId, input)),
      Promise.resolve(this.engine.evaluateWithCandidatePolicy(candidatePolicyVersion, input)),
    ]);

    return {
      actual,
      shadow,
      diverged: this.isDiverged(actual, shadow),
    };
  }

  simulate(input: PolicyEvalInput, candidatePolicyVersion: PolicyVersion): PolicyEvalResult {
    return this.engine.evaluateWithCandidatePolicy(candidatePolicyVersion, input);
  }

  private isDiverged(actual: PolicyEvalResult, shadow: PolicyEvalResult): boolean {
    if (actual.allowed !== shadow.allowed) {
      return true;
    }

    if (actual.matched_rule_id !== shadow.matched_rule_id) {
      return true;
    }

    if (actual.reason_codes.length !== shadow.reason_codes.length) {
      return true;
    }

    return actual.reason_codes.some((reasonCode, index) => reasonCode !== shadow.reason_codes[index]);
  }
}
