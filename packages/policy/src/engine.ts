import type {
  PolicyEvalInput,
  PolicyEvalResult,
  PolicyEvaluationOptions,
  PolicyRule,
  PolicyVersion,
} from "./schema";
import type { PolicyStore } from "./store";
import { createPolicyStore } from "./store";

const DEFAULT_EVALUATION_OPTIONS: PolicyEvaluationOptions = {
  track_usage: true,
};

export class PolicyEngine {
  private readonly store: PolicyStore;
  private readonly usageTimestamps = new Map<string, number[]>();

  constructor(store?: PolicyStore) {
    this.store = store ?? createPolicyStore();
  }

  registerPolicyVersion(policyVersion: Omit<PolicyVersion, "created_at"> & { created_at?: Date }): PolicyVersion {
    this.validatePolicyVersion(policyVersion);
    return this.store.upsertVersion(policyVersion);
  }

  setCurrentVersion(policyId: string, version: string): void {
    this.store.setCurrentVersion(policyId, version);
  }

  listPolicyVersions(policyId: string): PolicyVersion[] {
    return this.store.listVersions(policyId);
  }

  evaluate(policyId: string, input: PolicyEvalInput): PolicyEvalResult {
    const policyVersion = this.store.getCurrentVersion(policyId);
    if (!policyVersion) {
      return this.createResult(false, null, ["NO_MATCHING_POLICY"], null);
    }

    return this.evaluateAgainstVersion(policyVersion, input, DEFAULT_EVALUATION_OPTIONS);
  }

  simulate(policyId: string, input: PolicyEvalInput, version?: string): PolicyEvalResult {
    const policyVersion = version
      ? this.store.getVersion(policyId, version)
      : this.store.getCurrentVersion(policyId);
    if (!policyVersion) {
      return this.createResult(false, null, ["NO_MATCHING_POLICY"], null);
    }

    return this.evaluateAgainstVersion(policyVersion, input, { track_usage: false });
  }

  evaluateWithCandidatePolicy(candidatePolicyVersion: PolicyVersion, input: PolicyEvalInput): PolicyEvalResult {
    this.validatePolicyVersion(candidatePolicyVersion);
    return this.evaluateAgainstVersion(candidatePolicyVersion, input, { track_usage: false });
  }

  private evaluateAgainstVersion(
    policyVersion: PolicyVersion,
    input: PolicyEvalInput,
    options: PolicyEvaluationOptions
  ): PolicyEvalResult {
    this.validateEvalInput(input);

    const reasons = new Set<string>();
    const sortedRules = [...policyVersion.rules].sort((left, right) => right.priority - left.priority);

    for (const rule of sortedRules) {
      const evaluation = this.evaluateRule(rule, policyVersion, input, options);
      if (evaluation.allowed) {
        return this.createResult(true, policyVersion.version, ["POLICY_ALLOWED"], rule.id);
      }

      if (evaluation.explicit_deny) {
        return this.createResult(false, policyVersion.version, ["EXPLICIT_DENY_RULE"], rule.id);
      }

      for (const reason of evaluation.reason_codes) {
        reasons.add(reason);
      }
    }

    if (reasons.size === 0) {
      return this.createResult(false, policyVersion.version, ["NO_MATCHING_POLICY"], null);
    }

    return this.createResult(false, policyVersion.version, [...reasons], null);
  }

  private evaluateRule(
    rule: PolicyRule,
    policyVersion: PolicyVersion,
    input: PolicyEvalInput,
    options: PolicyEvaluationOptions
  ): {
    allowed: boolean;
    explicit_deny: boolean;
    reason_codes: string[];
  } {
    const reasonCodes: string[] = [];

    if (rule.action_types && !rule.action_types.includes(input.action_type)) {
      return { allowed: false, explicit_deny: false, reason_codes: [] };
    }

    if (rule.amount_limit && input.amount_sgd_cents > rule.amount_limit.max_amount_sgd_cents) {
      reasonCodes.push("AMOUNT_LIMIT_EXCEEDED");
    }

    if (
      rule.counterparty_whitelist &&
      !rule.counterparty_whitelist.includes(input.counterparty_id)
    ) {
      reasonCodes.push("COUNTERPARTY_NOT_ALLOWED");
    }

    if (rule.time_of_day && !this.matchesTimeOfDay(rule.time_of_day.start_hour, rule.time_of_day.end_hour, input)) {
      reasonCodes.push("OUTSIDE_ALLOWED_TIME_WINDOW");
    }

    if (rule.frequency_limit && !this.matchesFrequencyLimit(policyVersion, rule, input, options)) {
      reasonCodes.push("FREQUENCY_LIMIT_EXCEEDED");
    }

    if (reasonCodes.length > 0) {
      return { allowed: false, explicit_deny: false, reason_codes: reasonCodes };
    }

    if (rule.effect === "DENY") {
      return { allowed: false, explicit_deny: true, reason_codes: ["EXPLICIT_DENY_RULE"] };
    }

    this.recordFrequencyUsage(policyVersion, rule, input, options);
    return { allowed: true, explicit_deny: false, reason_codes: [] };
  }

  private matchesTimeOfDay(startHour: number, endHour: number, input: PolicyEvalInput): boolean {
    const occurredAt = input.occurred_at ?? new Date();
    const hour = occurredAt.getUTCHours();

    if (startHour === endHour) {
      return true;
    }

    if (startHour < endHour) {
      return hour >= startHour && hour < endHour;
    }

    return hour >= startHour || hour < endHour;
  }

  private matchesFrequencyLimit(
    policyVersion: PolicyVersion,
    rule: PolicyRule,
    input: PolicyEvalInput,
    options: PolicyEvaluationOptions
  ): boolean {
    if (!rule.frequency_limit) {
      return true;
    }

    const nowMs = (input.occurred_at ?? new Date()).getTime();
    const windowStart = nowMs - rule.frequency_limit.window_minutes * 60 * 1000;
    const usageKey = this.getUsageKey(policyVersion, rule, input);
    const existing = this.usageTimestamps.get(usageKey) ?? [];
    const recent = existing.filter((timestamp) => timestamp >= windowStart);

    if (options.track_usage) {
      this.usageTimestamps.set(usageKey, recent);
    }

    return recent.length < rule.frequency_limit.max_count;
  }

  private recordFrequencyUsage(
    policyVersion: PolicyVersion,
    rule: PolicyRule,
    input: PolicyEvalInput,
    options: PolicyEvaluationOptions
  ): void {
    if (!options.track_usage || !rule.frequency_limit) {
      return;
    }

    const nowMs = (input.occurred_at ?? new Date()).getTime();
    const usageKey = this.getUsageKey(policyVersion, rule, input);
    const existing = this.usageTimestamps.get(usageKey) ?? [];
    existing.push(nowMs);
    this.usageTimestamps.set(usageKey, existing);
  }

  private getUsageKey(policyVersion: PolicyVersion, rule: PolicyRule, input: PolicyEvalInput): string {
    return [
      policyVersion.policy_id,
      policyVersion.version,
      rule.id,
      input.agent_id,
      input.action_type,
      input.counterparty_id,
    ].join("::");
  }

  private validateEvalInput(input: PolicyEvalInput): void {
    if (!input.agent_id.trim()) {
      throw new Error("POLICY_AGENT_ID_REQUIRED");
    }

    if (!input.action_type.trim()) {
      throw new Error("POLICY_ACTION_TYPE_REQUIRED");
    }

    if (!Number.isInteger(input.amount_sgd_cents) || input.amount_sgd_cents < 0) {
      throw new Error("POLICY_AMOUNT_INVALID");
    }

    if (!input.counterparty_id.trim()) {
      throw new Error("POLICY_COUNTERPARTY_REQUIRED");
    }
  }

  private validatePolicyVersion(policyVersion: Omit<PolicyVersion, "created_at"> & { created_at?: Date }): void {
    if (!policyVersion.policy_id.trim()) {
      throw new Error("POLICY_ID_REQUIRED");
    }

    if (!policyVersion.version.trim()) {
      throw new Error("POLICY_VERSION_REQUIRED");
    }

    if (policyVersion.rules.length === 0) {
      throw new Error("POLICY_RULES_REQUIRED");
    }

    for (const rule of policyVersion.rules) {
      if (!rule.id.trim()) {
        throw new Error("POLICY_RULE_ID_REQUIRED");
      }
      if (!rule.name.trim()) {
        throw new Error("POLICY_RULE_NAME_REQUIRED");
      }
      if (!Number.isInteger(rule.priority)) {
        throw new Error("POLICY_RULE_PRIORITY_INVALID");
      }
      if (rule.amount_limit && (!Number.isInteger(rule.amount_limit.max_amount_sgd_cents) || rule.amount_limit.max_amount_sgd_cents < 0)) {
        throw new Error("POLICY_RULE_AMOUNT_LIMIT_INVALID");
      }
      if (rule.time_of_day) {
        const { start_hour: startHour, end_hour: endHour } = rule.time_of_day;
        if (
          !Number.isInteger(startHour) ||
          !Number.isInteger(endHour) ||
          startHour < 0 ||
          startHour > 23 ||
          endHour < 0 ||
          endHour > 23
        ) {
          throw new Error("POLICY_RULE_TIME_OF_DAY_INVALID");
        }
      }
      if (rule.frequency_limit) {
        if (
          !Number.isInteger(rule.frequency_limit.max_count) ||
          !Number.isInteger(rule.frequency_limit.window_minutes) ||
          rule.frequency_limit.max_count <= 0 ||
          rule.frequency_limit.window_minutes <= 0
        ) {
          throw new Error("POLICY_RULE_FREQUENCY_LIMIT_INVALID");
        }
      }
    }
  }

  private createResult(
    allowed: boolean,
    policyVersion: string | null,
    reasonCodes: string[],
    matchedRuleId: string | null
  ): PolicyEvalResult {
    return {
      allowed,
      policy_version: policyVersion,
      reason_codes: reasonCodes,
      matched_rule_id: matchedRuleId,
      evaluated_at: new Date(),
    };
  }
}
