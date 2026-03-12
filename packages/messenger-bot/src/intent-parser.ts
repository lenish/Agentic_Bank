/**
 * IntentParser: Natural language → structured intent
 * Recognizes: balance query, payment, policy query, history, agent status, unknown
 */

export type IntentType =
  | "BALANCE_QUERY"
  | "PAYMENT"
  | "POLICY_QUERY"
  | "HISTORY"
  | "AGENT_STATUS"
  | "UNKNOWN";

export interface ParsedIntent {
  readonly type: IntentType;
  readonly amount_sgd_cents?: number;
  readonly counterparty?: string;
  readonly agent_id?: string;
}

export class IntentParser {
  /**
   * Parse natural language text into structured intent.
   * Patterns:
   * - "check balance" / "balance" → BALANCE_QUERY
   * - "pay 500 SGD to merchant-1" / "send 1000 to agent-x" → PAYMENT
   * - "policy" / "what policies" → POLICY_QUERY
   * - "history" / "transactions" → HISTORY
   * - "agent status" / "status of agent" → AGENT_STATUS
   * - anything else → UNKNOWN
   */
  parse(text: string): ParsedIntent {
    const lower = text.toLowerCase().trim();

    // BALANCE_QUERY
    if (
      lower.includes("check balance") ||
      lower === "balance" ||
      lower.includes("my balance")
    ) {
      return { type: "BALANCE_QUERY" };
    }

    // PAYMENT: "pay 500 SGD to merchant-1" or "send 1000 to agent-x"
    const paymentMatch = lower.match(
      /(?:pay|send)\s+(\d+)\s*(?:sgd|dollars?)?\s+(?:to|from)\s+([a-z0-9\-_]+)/i,
    );
    if (paymentMatch) {
      const amountStr = paymentMatch[1];
      const counterparty = paymentMatch[2];
      return {
        type: "PAYMENT",
        amount_sgd_cents: parseInt(amountStr, 10) * 100, // Convert SGD to cents
        counterparty,
      };
    }

    // POLICY_QUERY
    if (
      lower.includes("policy") ||
      lower.includes("what policies") ||
      lower.includes("policies")
    ) {
      return { type: "POLICY_QUERY" };
    }

    // HISTORY
    if (
      lower.includes("history") ||
      lower.includes("transactions") ||
      lower.includes("recent")
    ) {
      return { type: "HISTORY" };
    }

    // AGENT_STATUS
    if (
      lower.includes("agent status") ||
      lower.includes("status of agent") ||
      lower.includes("agent") &&
        lower.includes("status")
    ) {
      return { type: "AGENT_STATUS" };
    }

    // UNKNOWN
    return { type: "UNKNOWN" };
  }
}
