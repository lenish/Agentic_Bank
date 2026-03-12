import type { RiskEvalInput, RiskRule } from "./schema";

const APAC_ALLOWED_COUNTRIES = new Set(["SG", "HK", "MY", "TH", "ID", "PH", "VN"]);
const HIGH_RISK_COUNTRIES = new Set(["KP", "IR", "SY", "CU"]);
const ALLOWED_ACTIONS = new Set(["TRANSFER", "QUERY_BALANCE", "ALLOCATE"]);

function normalizeCountry(country?: string): string {
  return (country ?? "").trim().toUpperCase();
}

function hasHistory(input: RiskEvalInput): input is RiskEvalInput & { agent_history: NonNullable<RiskEvalInput["agent_history"]> } {
  return Boolean(input.agent_history);
}

export const VELOCITY_CHECK_RULE: RiskRule = {
  id: "VELOCITY_CHECK",
  evaluate(input) {
    const isTriggered = hasHistory(input) && input.agent_history.transaction_count_last_hour > 5;
    return {
      triggered: isTriggered,
      score: isTriggered ? 30 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "VELOCITY_CHECK" : undefined,
    };
  },
};

export const AMOUNT_THRESHOLD_RULE: RiskRule = {
  id: "AMOUNT_THRESHOLD",
  evaluate(input) {
    const isTriggered = input.amount_sgd_cents > 5_000_000;
    return {
      triggered: isTriggered,
      score: isTriggered ? 25 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "AMOUNT_THRESHOLD" : undefined,
    };
  },
};

export const COUNTERPARTY_NOVELTY_RULE: RiskRule = {
  id: "COUNTERPARTY_NOVELTY",
  evaluate(input) {
    const isFirstTimeCounterparty =
      hasHistory(input) && !input.agent_history.last_seen_counterparty_ids.includes(input.counterparty_id);
    const isTriggered = isFirstTimeCounterparty && input.amount_sgd_cents > 100_000;
    return {
      triggered: isTriggered,
      score: isTriggered ? 20 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "COUNTERPARTY_NOVELTY" : undefined,
    };
  },
};

export const TIME_OF_DAY_RULE: RiskRule = {
  id: "TIME_OF_DAY",
  evaluate(input) {
    const sgtHour = (input.timestamp.getUTCHours() + 8) % 24;
    const isTriggered = sgtHour < 6 || sgtHour >= 22;
    return {
      triggered: isTriggered,
      score: isTriggered ? 20 : 0,
      decision: "NONE",
      reason_code: isTriggered ? "TIME_OF_DAY" : undefined,
    };
  },
};

export const GEO_MISMATCH_RULE: RiskRule = {
  id: "GEO_MISMATCH",
  evaluate(input) {
    const country = normalizeCountry(input.geo_country);
    const isTriggered = country.length > 0 && !APAC_ALLOWED_COUNTRIES.has(country);
    return {
      triggered: isTriggered,
      score: isTriggered ? 25 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "GEO_MISMATCH" : undefined,
    };
  },
};

export const SCOPE_DEVIATION_RULE: RiskRule = {
  id: "SCOPE_DEVIATION",
  evaluate(input) {
    const isTriggered = !ALLOWED_ACTIONS.has(input.action);
    return {
      triggered: isTriggered,
      score: isTriggered ? 40 : 0,
      decision: isTriggered ? "BLOCK" : "NONE",
      reason_code: isTriggered ? "SCOPE_DEVIATION" : undefined,
    };
  },
};

export const RAPID_SUCCESSION_RULE: RiskRule = {
  id: "RAPID_SUCCESSION",
  evaluate(input) {
    const recentCount = input.agent_history?.transaction_count_last_5_minutes ?? input.agent_history?.transaction_count_last_hour ?? 0;
    const isTriggered = recentCount > 3;
    return {
      triggered: isTriggered,
      score: isTriggered ? 25 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "RAPID_SUCCESSION" : undefined,
    };
  },
};

export const ROUND_AMOUNT_RULE: RiskRule = {
  id: "ROUND_AMOUNT",
  evaluate(input) {
    const isTriggered = Boolean(input.is_round_amount) && input.amount_sgd_cents > 1_000_000;
    return {
      triggered: isTriggered,
      score: isTriggered ? 15 : 0,
      decision: "NONE",
      reason_code: isTriggered ? "ROUND_AMOUNT" : undefined,
    };
  },
};

export const DORMANT_ACCOUNT_RULE: RiskRule = {
  id: "DORMANT_ACCOUNT",
  evaluate(input) {
    const isTriggered = Boolean(input.agent_history?.is_dormant);
    return {
      triggered: isTriggered,
      score: isTriggered ? 30 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "DORMANT_ACCOUNT" : undefined,
    };
  },
};

export const HIGH_RISK_COUNTRY_RULE: RiskRule = {
  id: "HIGH_RISK_COUNTRY",
  evaluate(input) {
    const country = normalizeCountry(input.geo_country);
    const isTriggered = country.length > 0 && HIGH_RISK_COUNTRIES.has(country);
    return {
      triggered: isTriggered,
      score: isTriggered ? 50 : 0,
      decision: isTriggered ? "BLOCK" : "NONE",
      reason_code: isTriggered ? "HIGH_RISK_COUNTRY" : undefined,
    };
  },
};

export const SANCTIONED_ENTITY_RULE: RiskRule = {
  id: "SANCTIONED_ENTITY",
  evaluate(input) {
    const isTriggered = input.counterparty_id.startsWith("SANCTIONED_");
    return {
      triggered: isTriggered,
      score: isTriggered ? 60 : 0,
      decision: isTriggered ? "BLOCK" : "NONE",
      reason_code: isTriggered ? "SANCTIONED_ENTITY" : undefined,
    };
  },
};

export const DUPLICATE_REQUEST_RULE: RiskRule = {
  id: "DUPLICATE_REQUEST",
  evaluate(input) {
    const isTriggered = (input.recent_request_ids ?? []).includes(input.request_id);
    return {
      triggered: isTriggered,
      score: isTriggered ? 70 : 0,
      decision: isTriggered ? "BLOCK" : "NONE",
      reason_code: isTriggered ? "DUPLICATE_REQUEST" : undefined,
    };
  },
};

export const BALANCE_ANOMALY_RULE: RiskRule = {
  id: "BALANCE_ANOMALY",
  evaluate(input) {
    const isTriggered = input.amount_sgd_cents > 1_000_000_00;
    return {
      triggered: isTriggered,
      score: isTriggered ? 30 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "BALANCE_ANOMALY" : undefined,
    };
  },
};

export const FREQUENCY_SPIKE_RULE: RiskRule = {
  id: "FREQUENCY_SPIKE",
  evaluate(input) {
    const isTriggered = (input.agent_history?.transaction_count_last_day ?? 0) > 100;
    return {
      triggered: isTriggered,
      score: isTriggered ? 25 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "FREQUENCY_SPIKE" : undefined,
    };
  },
};

export const CROSS_AGENT_COORDINATION_RULE: RiskRule = {
  id: "CROSS_AGENT_COORDINATION",
  evaluate(input) {
    const isTriggered = input.counterparty_id.startsWith("agent-") && input.amount_sgd_cents > 500_000;
    return {
      triggered: isTriggered,
      score: isTriggered ? 20 : 0,
      decision: isTriggered ? "HOLD" : "NONE",
      reason_code: isTriggered ? "CROSS_AGENT_COORDINATION" : undefined,
    };
  },
};

export const RISK_RULES: RiskRule[] = [
  VELOCITY_CHECK_RULE,
  AMOUNT_THRESHOLD_RULE,
  COUNTERPARTY_NOVELTY_RULE,
  TIME_OF_DAY_RULE,
  GEO_MISMATCH_RULE,
  SCOPE_DEVIATION_RULE,
  RAPID_SUCCESSION_RULE,
  ROUND_AMOUNT_RULE,
  DORMANT_ACCOUNT_RULE,
  HIGH_RISK_COUNTRY_RULE,
  SANCTIONED_ENTITY_RULE,
  DUPLICATE_REQUEST_RULE,
  BALANCE_ANOMALY_RULE,
  FREQUENCY_SPIKE_RULE,
  CROSS_AGENT_COORDINATION_RULE,
];
