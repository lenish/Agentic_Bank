import { Hono } from "hono";
import { TelegramBotHandler, type TelegramUpdate, type TelegramResponse } from "./telegram";
import { UserRegistry } from "./user-registry";
import { IntentParser } from "./intent-parser";
import { PipelineDisplay } from "./pipeline-display";

// Export all classes and types
export { TelegramBotHandler, type TelegramUpdate, type TelegramResponse } from "./telegram";
export { UserRegistry } from "./user-registry";
export { IntentParser, type ParsedIntent, type IntentType } from "./intent-parser";
export { PipelineDisplay, type PipelineStage, type StageStatus } from "./pipeline-display";

/**
 * Create messenger bot app with Telegram webhook support.
 * @param userRegistry Optional UserRegistry instance (creates new one if not provided)
 * @returns Hono app with POST /api/v1/telegram/webhook route
 */
export function createMessengerBotApp(userRegistry?: UserRegistry): Hono {
  const app = new Hono();
  const registry = userRegistry ?? new UserRegistry();
  const handler = new TelegramBotHandler(registry);

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

      const response = handler.handleUpdate(update);
      return c.json(response, 200);
    } catch (error) {
      console.error("Webhook error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
