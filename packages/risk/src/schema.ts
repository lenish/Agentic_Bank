export interface RiskAgentHistory {
  transaction_count_last_hour: number;
  transaction_count_last_day: number;
  last_seen_counterparty_ids: string[];
  is_dormant: boolean;
  transaction_count_last_5_minutes?: number;
}

export interface RiskEvalInput {
  agent_id: string;
  amount_sgd_cents: number;
  counterparty_id: string;
  action: string;
  timestamp: Date;
  agent_history?: RiskAgentHistory;
  geo_country?: string;
  is_round_amount?: boolean;
  request_id: string;
  recent_request_ids?: string[];
}

export type RiskDecision = "ALLOW" | "HOLD" | "BLOCK";
export type RiskRuleDecision = "NONE" | "HOLD" | "BLOCK";

export interface RiskRuleEvaluation {
  triggered: boolean;
  score: number;
  decision: RiskRuleDecision;
  reason_code?: string;
}

export interface RiskRule {
  id: string;
  evaluate: (input: RiskEvalInput) => RiskRuleEvaluation;
}

export interface RiskEvalResult {
  risk_score: number;
  decision: RiskDecision;
  reason_codes: string[];
  triggered_rules: string[];
  evaluated_at: Date;
  evaluation_ms: number;
}
