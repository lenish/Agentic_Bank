import { Hono } from "hono";
import { TelegramBotHandler, type TelegramUpdate, type TelegramResponse } from "./telegram";
import { SlackBotHandler, SlackWorkspaceRegistry, type SlackSlashCommandPayload, type SlackInteractionPayload, type SlackBlockResponse } from "./slack";
import { UserRegistry } from "./user-registry";
import { IntentParser } from "./intent-parser";
import { PipelineDisplay } from "./pipeline-display";

// Export all classes and types
export { TelegramBotHandler, type TelegramUpdate, type TelegramResponse } from "./telegram";
export { SlackBotHandler, SlackWorkspaceRegistry, type SlackSlashCommandPayload, type SlackInteractionPayload, type SlackBlockResponse, type SlackBlock, type SlackSectionBlock, type SlackDividerBlock, type SlackActionsBlock, type SlackButtonElement, type SlackTextObject } from "./slack";
export { UserRegistry } from "./user-registry";
export { IntentParser, type ParsedIntent, type IntentType } from "./intent-parser";
export { PipelineDisplay, type PipelineStage, type StageStatus } from "./pipeline-display";

/**
 * Create messenger bot app with Telegram webhook and Slack commands/interactions support.
 * @param userRegistry Optional UserRegistry instance (creates new one if not provided)
 * @param slackRegistry Optional SlackWorkspaceRegistry instance (creates new one if not provided)
 * @returns Hono app with POST /api/v1/telegram/webhook, /api/v1/slack/commands, /api/v1/slack/interactions routes
 */
export function createMessengerBotApp(
  userRegistry?: UserRegistry,
  slackRegistry?: SlackWorkspaceRegistry,
): Hono {
  const app = new Hono();

  // ── Telegram ─────────────────────────────────────────────────────────────
  const telegramRegistry = userRegistry ?? new UserRegistry();
  const telegramHandler = new TelegramBotHandler(telegramRegistry);

  /**
   * Telegram webhook endpoint.
   * Accepts Telegram Update JSON and returns response.
   */
  app.post("/api/v1/telegram/webhook", async (c) => {
    try {
      const update = (await c.req.json()) as TelegramUpdate;

      // Validate update structure
      if (!update.message || !update.message.from || !update.message.chat) {
        return c.json({ error: "Invalid update structure" }, 400);
      }

      const response = telegramHandler.handleUpdate(update);
      return c.json(response, 200);
    } catch (error) {
      console.error("Webhook error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ── Slack ────────────────────────────────────────────────────────────────
  const workspaceRegistry = slackRegistry ?? new SlackWorkspaceRegistry();
  const slackHandler = new SlackBotHandler(workspaceRegistry);

  /**
   * Slack slash command endpoint.
   * Accepts form-urlencoded slash command payload, returns Block Kit JSON.
   */
  app.post("/api/v1/slack/commands", async (c) => {
    try {
      const body = await c.req.parseBody();
      const payload: SlackSlashCommandPayload = {
        command: String(body["command"] ?? ""),
        text: String(body["text"] ?? ""),
        user_id: String(body["user_id"] ?? ""),
        channel_id: String(body["channel_id"] ?? ""),
        response_url: String(body["response_url"] ?? ""),
      };

      if (!payload.user_id) {
        return c.json({ error: "Missing user_id" }, 400);
      }

      const response = slackHandler.handleSlashCommand(payload);
      return c.json(response, 200);
    } catch (error) {
      console.error("Slack command error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * Slack interaction endpoint (button clicks, etc).
   * Accepts form-urlencoded with payload JSON string.
   */
  app.post("/api/v1/slack/interactions", async (c) => {
    try {
      const body = await c.req.parseBody();
      const payloadStr = body["payload"];
      if (typeof payloadStr !== "string") {
        return c.json({ error: "Missing payload" }, 400);
      }

      const payload = JSON.parse(payloadStr) as SlackInteractionPayload;

      if (!payload.user?.id) {
        return c.json({ error: "Invalid interaction payload" }, 400);
      }

      const response = slackHandler.handleInteraction(payload);
      return c.json(response, 200);
    } catch (error) {
      console.error("Slack interaction error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
