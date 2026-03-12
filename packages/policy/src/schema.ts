export interface AmountLimitCondition {
  max_amount_sgd_cents: number;
}

export interface TimeOfDayCondition {
  start_hour: number;
  end_hour: number;
}

export interface FrequencyLimitCondition {
  max_count: number;
  window_minutes: number;
}

export interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  effect: "ALLOW" | "DENY";
  amount_limit?: AmountLimitCondition;
  counterparty_whitelist?: string[];
  time_of_day?: TimeOfDayCondition;
  action_types?: string[];
  frequency_limit?: FrequencyLimitCondition;
}

export interface PolicyVersion {
  policy_id: string;
  version: string;
  rules: PolicyRule[];
  created_at: Date;
  effective_from: Date;
  effective_to?: Date;
}

export interface PolicyEvalInput {
  agent_id: string;
  action_type: string;
  amount_sgd_cents: number;
  counterparty_id: string;
  occurred_at?: Date;
  trace_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvalResult {
  allowed: boolean;
  policy_version: string | null;
  reason_codes: string[];
  matched_rule_id: string | null;
  evaluated_at: Date;
}

export interface PolicyEvaluationOptions {
  track_usage: boolean;
}

export interface ShadowEvaluationResult {
  actual: PolicyEvalResult;
  shadow: PolicyEvalResult;
  diverged: boolean;
}
