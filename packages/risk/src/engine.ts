import { RISK_RULES } from "./rules";
import type { RiskDecision, RiskEvalInput, RiskEvalResult, RiskRule } from "./schema";

const MAX_RISK_SCORE = 100;

export class RiskEngine {
  private readonly rulesById = new Map<string, RiskRule>();
  private readonly activeRuleIds = new Set<string>();

  constructor(rules: RiskRule[] = RISK_RULES) {
    for (const rule of rules) {
      this.rulesById.set(rule.id, rule);
      this.activeRuleIds.add(rule.id);
    }
  }

  evaluate(input: RiskEvalInput): RiskEvalResult {
    this.validateInput(input);

    const startedAtMs = Date.now();
    let score = 0;
    let hasHoldRule = false;
    let hasBlockRule = false;
    const triggeredRules: string[] = [];
    const reasonCodes: string[] = [];

    for (const [ruleId, rule] of this.rulesById.entries()) {
      if (!this.activeRuleIds.has(ruleId)) {
        continue;
      }

      const evaluation = rule.evaluate(input);
      if (!evaluation.triggered) {
        continue;
      }

      score += evaluation.score;
      triggeredRules.push(ruleId);
      reasonCodes.push(evaluation.reason_code ?? ruleId);

      if (evaluation.decision === "BLOCK") {
        hasBlockRule = true;
      }

      if (evaluation.decision === "HOLD") {
        hasHoldRule = true;
      }
    }

    const boundedScore = Math.min(score, MAX_RISK_SCORE);
    const decision = this.resolveDecision(hasBlockRule, hasHoldRule, boundedScore);

    return {
      risk_score: boundedScore,
      decision,
      reason_codes: reasonCodes,
      triggered_rules: triggeredRules,
      evaluated_at: new Date(),
      evaluation_ms: Date.now() - startedAtMs,
    };
  }

  deactivateRule(ruleId: string): void {
    this.assertRuleExists(ruleId);
    this.activeRuleIds.delete(ruleId);
  }

  activateRule(ruleId: string): void {
    this.assertRuleExists(ruleId);
    this.activeRuleIds.add(ruleId);
  }

  isRuleActive(ruleId: string): boolean {
    this.assertRuleExists(ruleId);
    return this.activeRuleIds.has(ruleId);
  }

  listRuleIds(): string[] {
    return [...this.rulesById.keys()];
  }

  private resolveDecision(hasBlockRule: boolean, hasHoldRule: boolean, score: number): RiskDecision {
    if (hasBlockRule) {
      return "BLOCK";
    }

    if (hasHoldRule) {
      return "HOLD";
    }

    if (score > 70) {
      return "HOLD";
    }

    return "ALLOW";
  }

  private assertRuleExists(ruleId: string): void {
    if (!this.rulesById.has(ruleId)) {
      throw new Error("RISK_RULE_NOT_FOUND");
    }
  }

  private validateInput(input: RiskEvalInput): void {
    if (!input.agent_id.trim()) {
      throw new Error("RISK_AGENT_ID_REQUIRED");
    }

    if (!input.counterparty_id.trim()) {
      throw new Error("RISK_COUNTERPARTY_ID_REQUIRED");
    }

    if (!input.action.trim()) {
      throw new Error("RISK_ACTION_REQUIRED");
    }

    if (!input.request_id.trim()) {
      throw new Error("RISK_REQUEST_ID_REQUIRED");
    }

    if (!Number.isInteger(input.amount_sgd_cents) || input.amount_sgd_cents < 0) {
      throw new Error("RISK_AMOUNT_INVALID");
    }

    if (!(input.timestamp instanceof Date) || Number.isNaN(input.timestamp.getTime())) {
      throw new Error("RISK_TIMESTAMP_INVALID");
    }
  }
}
