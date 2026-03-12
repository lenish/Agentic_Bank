/**
 * SlackBotHandler: Webhook handler for Slack slash commands and interactions
 * Flow: auth check -> intent parse -> mock response in Block Kit format
 */

import { IntentParser, type ParsedIntent } from "./intent-parser";
import { PipelineDisplay, type PipelineStage } from "./pipeline-display";

// ── Block Kit Types ──────────────────────────────────────────────────────────

export interface SlackTextObject {
  readonly type: "plain_text" | "mrkdwn";
  readonly text: string;
}

export interface SlackButtonElement {
  readonly type: "button";
  readonly text: SlackTextObject;
  readonly action_id: string;
  readonly value?: string;
}

export interface SlackSectionBlock {
  readonly type: "section";
  readonly text: SlackTextObject;
}

export interface SlackDividerBlock {
  readonly type: "divider";
}

export interface SlackActionsBlock {
  readonly type: "actions";
  readonly elements: readonly SlackButtonElement[];
}

export type SlackBlock = SlackSectionBlock | SlackDividerBlock | SlackActionsBlock;

export interface SlackBlockResponse {
  readonly response_type?: "in_channel" | "ephemeral";
  readonly blocks: readonly SlackBlock[];
}

// ── Slack Incoming Payloads ──────────────────────────────────────────────────

export interface SlackSlashCommandPayload {
  readonly command: string;
  readonly text: string;
  readonly user_id: string;
  readonly channel_id: string;
  readonly response_url: string;
}

export interface SlackInteractionPayload {
  readonly type: "block_actions";
  readonly user: {
    readonly id: string;
  };
  readonly channel: {
    readonly id: string;
  };
  readonly actions: readonly {
    readonly action_id: string;
    readonly value?: string;
  }[];
}

// ── SlackWorkspaceRegistry ───────────────────────────────────────────────────

/**
 * SlackWorkspaceRegistry: Slack user_id <-> AOA account mapping
 * In-memory Map store for Phase 1 (mirrors UserRegistry for Telegram)
 */
export class SlackWorkspaceRegistry {
  private readonly store: Map<string, string> = new Map();

  /**
   * Register a Slack user to an AOA account.
   * @param slackUserId Slack user ID (string, e.g. "U_TEST")
   * @param aoaAccountId AOA account ID (string)
   */
  register(slackUserId: string, aoaAccountId: string): void {
    this.store.set(slackUserId, aoaAccountId);
  }

  /**
   * Look up AOA account ID by Slack user ID.
   * @param slackUserId Slack user ID
   * @returns AOA account ID or undefined if not registered
   */
  lookup(slackUserId: string): string | undefined {
    return this.store.get(slackUserId);
  }

  /**
   * Check if a Slack user is registered.
   * @param slackUserId Slack user ID
   * @returns true if registered, false otherwise
   */
  isRegistered(slackUserId: string): boolean {
    return this.store.has(slackUserId);
  }

  /**
   * Unregister a Slack user (for testing/cleanup).
   * @param slackUserId Slack user ID
   */
  unregister(slackUserId: string): void {
    this.store.delete(slackUserId);
  }

  /**
   * Clear all registrations (for testing).
   */
  clear(): void {
    this.store.clear();
  }
}

// ── SlackBotHandler ──────────────────────────────────────────────────────────

export class SlackBotHandler {
  private readonly intentParser: IntentParser;
  private readonly pipelineDisplay: PipelineDisplay;
  private readonly workspaceRegistry: SlackWorkspaceRegistry;

  constructor(workspaceRegistry: SlackWorkspaceRegistry) {
    this.intentParser = new IntentParser();
    this.pipelineDisplay = new PipelineDisplay();
    this.workspaceRegistry = workspaceRegistry;
  }

  /**
   * Handle incoming Slack slash command.
   * Flow:
   * 1. Check if user is registered
   * 2. If not -> return Block Kit linking instructions
   * 3. Parse intent from command text
   * 4. Return Block Kit response (balance, payment pipeline, etc.)
   */
  handleSlashCommand(payload: SlackSlashCommandPayload): SlackBlockResponse {
    const userId = payload.user_id;
    const text = payload.text;

    // Check if user is registered
    const aoaAccountId = this.workspaceRegistry.lookup(userId);
    if (!aoaAccountId) {
      return this.buildUnlinkedResponse(userId);
    }

    // Parse intent
    const intent = this.intentParser.parse(text);

    // Handle by intent type
    switch (intent.type) {
      case "BALANCE_QUERY":
        return this.handleBalanceQuery(aoaAccountId);

      case "PAYMENT":
        return this.handlePayment(aoaAccountId, intent);

      case "POLICY_QUERY":
        return this.handlePolicyQuery(aoaAccountId);

      case "HISTORY":
        return this.handleHistory(aoaAccountId);

      case "AGENT_STATUS":
        return this.handleAgentStatus(aoaAccountId);

      case "UNKNOWN":
      default:
        return this.buildUnknownResponse();
    }
  }

  /**
   * Handle Slack interactive action (button clicks).
   * Currently supports: confirm_payment, cancel_payment
   */
  handleInteraction(payload: SlackInteractionPayload): SlackBlockResponse {
    const userId = payload.user.id;
    const aoaAccountId = this.workspaceRegistry.lookup(userId);

    if (!aoaAccountId) {
      return this.buildUnlinkedResponse(userId);
    }

    const action = payload.actions[0];
    if (!action) {
      return this.buildUnknownResponse();
    }

    switch (action.action_id) {
      case "confirm_payment":
        return {
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:white_check_mark: *Payment confirmed* for ${aoaAccountId}`,
              },
            },
          ],
        };

      case "cancel_payment":
        return {
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:x: *Payment cancelled* for ${aoaAccountId}`,
              },
            },
          ],
        };

      default:
        return this.buildUnknownResponse();
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private buildUnlinkedResponse(slackUserId: string): SlackBlockResponse {
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:link: *Link your AOA account*\nVisit <https://aoa.example.com/auth?slack_id=${slackUserId}|AOA Auth> to connect your Slack account.`,
          },
        },
      ],
    };
  }

  private buildUnknownResponse(): SlackBlockResponse {
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "I don't understand. Try:\n`/aoa balance` | `/aoa pay 500 SGD to merchant-1` | `/aoa policy` | `/aoa history` | `/aoa status`",
          },
        },
      ],
    };
  }

  private handleBalanceQuery(aoaAccountId: string): SlackBlockResponse {
    const balanceSgd = 1234.56;
    const formatted = balanceSgd.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:bank: *Balance*: SGD ${formatted}`,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Account: \`${aoaAccountId}\``,
          },
        },
      ],
    };
  }

  private handlePayment(
    aoaAccountId: string,
    intent: ParsedIntent,
  ): SlackBlockResponse {
    const amount = intent.amount_sgd_cents ?? 0;
    const counterparty = intent.counterparty ?? "unknown";
    const amountSgd = (amount / 100).toFixed(2);
    const decisionId = crypto.randomUUID();

    // Mock 5-stage pipeline
    const stages: PipelineStage[] = [
      { name: "Intent Parse", status: "DONE", elapsed_ms: 12 },
      { name: "Policy Check", status: "DONE", elapsed_ms: 8 },
      { name: "Risk Score", status: "DONE", elapsed_ms: 15 },
      { name: "Settlement Execute", status: "DONE", elapsed_ms: 45 },
      { name: "Audit Record", status: "DONE", elapsed_ms: 5 },
    ];

    const pipelineText = this.pipelineDisplay.format(stages);

    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:money_with_wings: *Payment*: SGD ${amountSgd} to \`${counterparty}\``,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Pipeline*\n\`\`\`\n${pipelineText}\n\`\`\``,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Decision ID: \`${decisionId}\`\nAccount: \`${aoaAccountId}\``,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Confirm" },
              action_id: "confirm_payment",
              value: decisionId,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Cancel" },
              action_id: "cancel_payment",
              value: decisionId,
            },
          ],
        },
      ],
    };
  }

  private handlePolicyQuery(aoaAccountId: string): SlackBlockResponse {
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:shield: *Policies for* \`${aoaAccountId}\``,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "- Daily limit: SGD 10,000\n- Counterparty whitelist: enabled\n- Time-of-day restrictions: 06:00-22:00 SGD",
          },
        },
      ],
    };
  }

  private handleHistory(aoaAccountId: string): SlackBlockResponse {
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:ledger: *Recent transactions for* \`${aoaAccountId}\``,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "1. SGD 500 to merchant-1 (2026-03-12 14:30)\n2. SGD 250 to agent-x (2026-03-12 13:15)",
          },
        },
      ],
    };
  }

  private handleAgentStatus(aoaAccountId: string): SlackBlockResponse {
    return {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:robot_face: *Agent status for* \`${aoaAccountId}\``,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "- Status: ACTIVE\n- KYA: VERIFIED\n- Last activity: 2026-03-12 14:30",
          },
        },
      ],
    };
  }
}
