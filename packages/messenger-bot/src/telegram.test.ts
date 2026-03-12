import { describe, it, expect, beforeEach } from "bun:test";
import { TelegramBotHandler, type TelegramUpdate } from "./telegram";
import { UserRegistry } from "./user-registry";
import { IntentParser } from "./intent-parser";
import { PipelineDisplay } from "./pipeline-display";

describe("TelegramBotHandler", () => {
  let handler: TelegramBotHandler;
  let registry: UserRegistry;

  beforeEach(() => {
    registry = new UserRegistry();
    handler = new TelegramBotHandler(registry);
  });

  // Test 1: Unauthenticated user → auth instructions
  it("should return auth instructions for unregistered user", () => {
    const update: TelegramUpdate = {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 99999 },
        chat: { id: 99999 },
        text: "check balance",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(99999);
    expect(response.text).toContain("authenticate");
    expect(response.text).toContain("telegram_id=99999");
  });

  // Test 2: Balance query for registered user
  it("should return balance for registered user", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "check balance",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("Balance");
    expect(response.text).toContain("SGD");
    expect(response.text).toContain("account-001");
  });

  // Test 3: Payment intent parsing and pipeline display
  it("should handle payment with pipeline visualization", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 3,
      message: {
        message_id: 3,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "pay 500 SGD to merchant-1",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("Payment");
    expect(response.text).toContain("500.00");
    expect(response.text).toContain("merchant-1");
    expect(response.text).toContain("Decision ID");
    expect(response.text).toContain("✅ Intent Parse");
    expect(response.text).toContain("✅ Policy Check");
    expect(response.text).toContain("✅ Risk Score");
  });

  // Test 4: Unknown intent
  it("should return help text for unknown intent", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 4,
      message: {
        message_id: 4,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "hello world",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("don't understand");
    expect(response.text).toContain("check balance");
  });

  // Test 5: Policy query
  it("should return policy info for policy query", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 5,
      message: {
        message_id: 5,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "what policies",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("Policies");
    expect(response.text).toContain("account-001");
  });

  // Test 6: History query
  it("should return transaction history", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 6,
      message: {
        message_id: 6,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "history",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("Recent transactions");
    expect(response.text).toContain("account-001");
  });

  // Test 7: Agent status query
  it("should return agent status", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 7,
      message: {
        message_id: 7,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "agent status",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("Agent status");
    expect(response.text).toContain("ACTIVE");
  });

  // Test 8: Payment with different amount formats
  it("should parse payment with various amount formats", () => {
    registry.register(12345, "account-001");

    const update: TelegramUpdate = {
      update_id: 8,
      message: {
        message_id: 8,
        from: { id: 12345 },
        chat: { id: 12345 },
        text: "send 1000 to agent-x",
      },
    };

    const response = handler.handleUpdate(update);

    expect(response.chat_id).toBe(12345);
    expect(response.text).toContain("1000.00");
    expect(response.text).toContain("agent-x");
  });
});

describe("IntentParser", () => {
  let parser: IntentParser;

  beforeEach(() => {
    parser = new IntentParser();
  });

  it("should parse balance query", () => {
    const intent = parser.parse("check balance");
    expect(intent.type).toBe("BALANCE_QUERY");
  });

  it("should parse payment intent with amount and counterparty", () => {
    const intent = parser.parse("pay 500 SGD to merchant-1");
    expect(intent.type).toBe("PAYMENT");
    expect(intent.amount_sgd_cents).toBe(50000); // 500 SGD = 50000 cents
    expect(intent.counterparty).toBe("merchant-1");
  });

  it("should parse policy query", () => {
    const intent = parser.parse("what policies");
    expect(intent.type).toBe("POLICY_QUERY");
  });

  it("should parse history query", () => {
    const intent = parser.parse("history");
    expect(intent.type).toBe("HISTORY");
  });

  it("should parse agent status query", () => {
    const intent = parser.parse("agent status");
    expect(intent.type).toBe("AGENT_STATUS");
  });

  it("should return UNKNOWN for unrecognized text", () => {
    const intent = parser.parse("xyz abc");
    expect(intent.type).toBe("UNKNOWN");
  });
});

describe("PipelineDisplay", () => {
  let display: PipelineDisplay;

  beforeEach(() => {
    display = new PipelineDisplay();
  });

  it("should format pipeline with all stages done", () => {
    const stages = [
      { name: "Intent Parse", status: "DONE" as const, elapsed_ms: 12 },
      { name: "Policy Check", status: "DONE" as const, elapsed_ms: 8 },
      { name: "Risk Score", status: "DONE" as const, elapsed_ms: 15 },
    ];

    const text = display.format(stages);

    expect(text).toContain("✅ Intent Parse (12ms)");
    expect(text).toContain("✅ Policy Check (8ms)");
    expect(text).toContain("✅ Risk Score (15ms)");
  });

  it("should format pipeline with mixed statuses", () => {
    const stages = [
      { name: "Intent Parse", status: "DONE" as const, elapsed_ms: 12 },
      { name: "Policy Check", status: "RUNNING" as const },
      { name: "Risk Score", status: "PENDING" as const },
    ];

    const text = display.format(stages);

    expect(text).toContain("✅ Intent Parse");
    expect(text).toContain("⏳ Policy Check");
    expect(text).toContain("⬜ Risk Score");
  });

  it("should format error stage with reason", () => {
    const stages = [
      { name: "Intent Parse", status: "DONE" as const, elapsed_ms: 12 },
      {
        name: "Policy Check",
        status: "ERROR" as const,
        elapsed_ms: 8,
        reason: "AMOUNT_LIMIT_EXCEEDED",
      },
    ];

    const text = display.format(stages);

    expect(text).toContain("❌ Policy Check (8ms) — AMOUNT_LIMIT_EXCEEDED");
  });
});

describe("UserRegistry", () => {
  let registry: UserRegistry;

  beforeEach(() => {
    registry = new UserRegistry();
  });

  it("should register and lookup user", () => {
    registry.register(12345, "account-001");
    const result = registry.lookup(12345);
    expect(result).toBe("account-001");
  });

  it("should return undefined for unregistered user", () => {
    const result = registry.lookup(99999);
    expect(result).toBeUndefined();
  });

  it("should check if user is registered", () => {
    registry.register(12345, "account-001");
    expect(registry.isRegistered(12345)).toBe(true);
    expect(registry.isRegistered(99999)).toBe(false);
  });

  it("should unregister user", () => {
    registry.register(12345, "account-001");
    registry.unregister(12345);
    expect(registry.isRegistered(12345)).toBe(false);
  });

  it("should clear all registrations", () => {
    registry.register(12345, "account-001");
    registry.register(54321, "account-002");
    registry.clear();
    expect(registry.isRegistered(12345)).toBe(false);
    expect(registry.isRegistered(54321)).toBe(false);
  });
});
