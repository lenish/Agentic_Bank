/**
 * TelegramBotHandler: Webhook handler for Telegram updates
 * Flow: auth check → intent parse → mock response
 */

import { IntentParser, type ParsedIntent } from "./intent-parser";
import { PipelineDisplay, type PipelineStage } from "./pipeline-display";
import { UserRegistry } from "./user-registry";

export interface TelegramMessage {
  readonly message_id: number;
  readonly from: {
    readonly id: number;
  };
  readonly chat: {
    readonly id: number;
  };
  readonly text: string;
}

export interface TelegramUpdate {
  readonly update_id: number;
  readonly message: TelegramMessage;
}

export interface TelegramResponse {
  readonly chat_id: number;
  readonly text: string;
}

export class TelegramBotHandler {
  private readonly intentParser: IntentParser;
  private readonly pipelineDisplay: PipelineDisplay;
  private readonly userRegistry: UserRegistry;

  constructor(userRegistry: UserRegistry) {
    this.intentParser = new IntentParser();
    this.pipelineDisplay = new PipelineDisplay();
    this.userRegistry = userRegistry;
  }

  /**
   * Handle incoming Telegram update.
   * Flow:
   * 1. Check if user is registered
   * 2. If not → return auth instructions
   * 3. Parse intent
   * 4. Return appropriate response (balance, payment pipeline, etc.)
   */
  handleUpdate(update: TelegramUpdate): TelegramResponse {
    const chatId = update.message.chat.id;
    const userId = update.message.from.id;
    const text = update.message.text;

    // Check if user is registered
    const aoaAccountId = this.userRegistry.lookup(userId);
    if (!aoaAccountId) {
      return {
        chat_id: chatId,
        text: `Please authenticate at https://aoa.example.com/auth?telegram_id=${userId}`,
      };
    }

    // Parse intent
    const intent = this.intentParser.parse(text);

    // Handle by intent type
    switch (intent.type) {
      case "BALANCE_QUERY":
        return this.handleBalanceQuery(chatId, aoaAccountId);

      case "PAYMENT":
        return this.handlePayment(chatId, aoaAccountId, intent);

      case "POLICY_QUERY":
        return this.handlePolicyQuery(chatId, aoaAccountId);

      case "HISTORY":
        return this.handleHistory(chatId, aoaAccountId);

      case "AGENT_STATUS":
        return this.handleAgentStatus(chatId, aoaAccountId);

      case "UNKNOWN":
      default:
        return {
          chat_id: chatId,
          text: "I don't understand. Try: 'check balance', 'pay 500 SGD to merchant-1'",
        };
    }
  }

  private handleBalanceQuery(
    chatId: number,
    aoaAccountId: string,
  ): TelegramResponse {
    // Mock balance response
    const balanceSgd = 1234.56;
    return {
      chat_id: chatId,
      text: `Balance: SGD ${balanceSgd.toFixed(2)} (account: ${aoaAccountId})`,
    };
  }

  private handlePayment(
    chatId: number,
    aoaAccountId: string,
    intent: ParsedIntent,
  ): TelegramResponse {
    const amount = intent.amount_sgd_cents ?? 0;
    const counterparty = intent.counterparty ?? "unknown";

    // Mock 5-stage pipeline
    const stages: PipelineStage[] = [
      { name: "Intent Parse", status: "DONE", elapsed_ms: 12 },
      { name: "Policy Check", status: "DONE", elapsed_ms: 8 },
      { name: "Risk Score", status: "DONE", elapsed_ms: 15 },
      { name: "Settlement Execute", status: "DONE", elapsed_ms: 45 },
      { name: "Audit Record", status: "DONE", elapsed_ms: 5 },
    ];

    const pipelineText = this.pipelineDisplay.format(stages);
    const amountSgd = (amount / 100).toFixed(2);
    const decisionId = crypto.randomUUID();

    return {
      chat_id: chatId,
      text: `Payment: SGD ${amountSgd} to ${counterparty}\nDecision ID: ${decisionId}\n\n${pipelineText}`,
    };
  }

  private handlePolicyQuery(
    chatId: number,
    aoaAccountId: string,
  ): TelegramResponse {
    return {
      chat_id: chatId,
      text: `Policies for ${aoaAccountId}:\n- Daily limit: SGD 10,000\n- Counterparty whitelist: enabled\n- Time-of-day restrictions: 06:00-22:00 SGD`,
    };
  }

  private handleHistory(
    chatId: number,
    aoaAccountId: string,
  ): TelegramResponse {
    return {
      chat_id: chatId,
      text: `Recent transactions for ${aoaAccountId}:\n1. SGD 500 to merchant-1 (2026-03-12 14:30)\n2. SGD 250 to agent-x (2026-03-12 13:15)`,
    };
  }

  private handleAgentStatus(
    chatId: number,
    aoaAccountId: string,
  ): TelegramResponse {
    return {
      chat_id: chatId,
      text: `Agent status for ${aoaAccountId}:\n- Status: ACTIVE\n- KYA: VERIFIED\n- Last activity: 2026-03-12 14:30`,
    };
  }
}
