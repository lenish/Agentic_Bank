import { describe, it, expect, beforeEach } from "bun:test";
import {
  SlackBotHandler,
  SlackWorkspaceRegistry,
  type SlackSlashCommandPayload,
  type SlackInteractionPayload,
  type SlackBlockResponse,
  type SlackSectionBlock,
  type SlackActionsBlock,
} from "./slack";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSlashPayload(
  text: string,
  userId = "U_TEST",
): SlackSlashCommandPayload {
  return {
    command: "/aoa",
    text,
    user_id: userId,
    channel_id: "C_TEST",
    response_url: "https://hooks.slack.com/commands/test",
  };
}

function makeInteractionPayload(
  actionId: string,
  userId = "U_TEST",
  value?: string,
): SlackInteractionPayload {
  return {
    type: "block_actions",
    user: { id: userId },
    channel: { id: "C_TEST" },
    actions: [{ action_id: actionId, value }],
  };
}

/** Extract mrkdwn text from first section block */
function firstSectionText(response: SlackBlockResponse): string {
  const section = response.blocks.find(
    (b): b is SlackSectionBlock => b.type === "section",
  );
  return section?.text.text ?? "";
}

/** Concatenate all section block texts */
function allSectionTexts(response: SlackBlockResponse): string {
  return response.blocks
    .filter((b): b is SlackSectionBlock => b.type === "section")
    .map((b) => b.text.text)
    .join("\n");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SlackBotHandler", () => {
  let handler: SlackBotHandler;
  let registry: SlackWorkspaceRegistry;

  beforeEach(() => {
    registry = new SlackWorkspaceRegistry();
    handler = new SlackBotHandler(registry);
  });

  // Test 1: Unlinked user -> linking instructions
  it("should return linking instructions for unregistered user", () => {
    const payload = makeSlashPayload("balance", "U_UNKNOWN");
    const response = handler.handleSlashCommand(payload);

    expect(response.response_type).toBe("ephemeral");
    const text = firstSectionText(response);
    expect(text).toContain("Link your AOA account");
    expect(text).toContain("slack_id=U_UNKNOWN");
  });

  // Test 2: Balance query -> Block Kit sections with balance
  it("should return balance in Block Kit format for registered user", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("balance");
    const response = handler.handleSlashCommand(payload);

    const allText = allSectionTexts(response);
    expect(allText).toContain("Balance");
    expect(allText).toContain("SGD 1,234.56");
    expect(allText).toContain("account-001");
    // Should have divider between sections
    expect(response.blocks.some((b) => b.type === "divider")).toBe(true);
  });

  // Test 3: Payment -> pipeline + confirm/cancel buttons
  it("should return payment pipeline with action buttons", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("pay 500 SGD to merchant-1");
    const response = handler.handleSlashCommand(payload);

    expect(response.response_type).toBe("in_channel");
    const allText = allSectionTexts(response);
    expect(allText).toContain("Payment");
    expect(allText).toContain("500.00");
    expect(allText).toContain("merchant-1");
    expect(allText).toContain("Decision ID");
    // Pipeline stages in code block
    expect(allText).toContain("Intent Parse");
    expect(allText).toContain("Audit Record");
    // Actions block with confirm/cancel buttons
    const actionsBlock = response.blocks.find(
      (b): b is SlackActionsBlock => b.type === "actions",
    );
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock!.elements.length).toBe(2);
    expect(actionsBlock!.elements[0].action_id).toBe("confirm_payment");
    expect(actionsBlock!.elements[1].action_id).toBe("cancel_payment");
  });

  // Test 4: Policy query -> Block Kit sections
  it("should return policy info in Block Kit format", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("policy");
    const response = handler.handleSlashCommand(payload);

    const allText = allSectionTexts(response);
    expect(allText).toContain("Policies");
    expect(allText).toContain("account-001");
    expect(allText).toContain("Daily limit");
  });

  // Test 5: History query
  it("should return transaction history in Block Kit format", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("history");
    const response = handler.handleSlashCommand(payload);

    const allText = allSectionTexts(response);
    expect(allText).toContain("Recent transactions");
    expect(allText).toContain("account-001");
    expect(allText).toContain("merchant-1");
  });

  // Test 6: Agent status query
  it("should return agent status in Block Kit format", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("agent status");
    const response = handler.handleSlashCommand(payload);

    const allText = allSectionTexts(response);
    expect(allText).toContain("Agent status");
    expect(allText).toContain("account-001");
    expect(allText).toContain("ACTIVE");
    expect(allText).toContain("VERIFIED");
  });

  // Test 7: Unknown intent -> help text
  it("should return help text for unknown intent", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeSlashPayload("xyz gibberish");
    const response = handler.handleSlashCommand(payload);

    const text = firstSectionText(response);
    expect(text).toContain("don't understand");
    expect(text).toContain("/aoa balance");
  });

  // Test 8: Interaction -> confirm_payment action
  it("should handle confirm_payment interaction", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeInteractionPayload("confirm_payment", "U_TEST");
    const response = handler.handleInteraction(payload);

    const text = firstSectionText(response);
    expect(text).toContain("Payment confirmed");
    expect(text).toContain("account-001");
  });

  // Test 9: Interaction -> cancel_payment action
  it("should handle cancel_payment interaction", () => {
    registry.register("U_TEST", "account-001");
    const payload = makeInteractionPayload("cancel_payment", "U_TEST");
    const response = handler.handleInteraction(payload);

    const text = firstSectionText(response);
    expect(text).toContain("Payment cancelled");
    expect(text).toContain("account-001");
  });

  // Test 10: Interaction from unlinked user
  it("should return linking instructions for unlinked interaction user", () => {
    const payload = makeInteractionPayload("confirm_payment", "U_UNKNOWN");
    const response = handler.handleInteraction(payload);

    const text = firstSectionText(response);
    expect(text).toContain("Link your AOA account");
    expect(text).toContain("slack_id=U_UNKNOWN");
  });
});

describe("SlackWorkspaceRegistry", () => {
  let registry: SlackWorkspaceRegistry;

  beforeEach(() => {
    registry = new SlackWorkspaceRegistry();
  });

  it("should register and lookup user", () => {
    registry.register("U_ABC", "account-001");
    expect(registry.lookup("U_ABC")).toBe("account-001");
  });

  it("should return undefined for unregistered user", () => {
    expect(registry.lookup("U_NONE")).toBeUndefined();
  });

  it("should check if user is registered", () => {
    registry.register("U_ABC", "account-001");
    expect(registry.isRegistered("U_ABC")).toBe(true);
    expect(registry.isRegistered("U_NONE")).toBe(false);
  });

  it("should unregister user", () => {
    registry.register("U_ABC", "account-001");
    registry.unregister("U_ABC");
    expect(registry.isRegistered("U_ABC")).toBe(false);
  });

  it("should clear all registrations", () => {
    registry.register("U_ABC", "account-001");
    registry.register("U_DEF", "account-002");
    registry.clear();
    expect(registry.isRegistered("U_ABC")).toBe(false);
    expect(registry.isRegistered("U_DEF")).toBe(false);
  });
});
