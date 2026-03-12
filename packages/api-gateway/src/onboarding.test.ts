import { describe, expect, test, beforeEach } from "bun:test";
import {
  PilotOnboardingService,
  PILOT_CUSTOMERS,
  type OnboardingResult,
  type TransactionRecord,
  type FeedbackRecord,
  type PilotReport,
} from "./onboarding";

describe("PilotOnboardingService", () => {
  let service: PilotOnboardingService;

  beforeEach(() => {
    service = new PilotOnboardingService();
  });

  // ── onboardCustomer ──────────────────────────────────────────────

  test("onboards pilot-001 with master account + 2 agent sub-accounts", () => {
    const result: OnboardingResult = service.onboardCustomer("pilot-001");

    expect(result.customerId).toBe("pilot-001");
    expect(result.customerName).toBe("TechCorp Singapore");
    expect(result.status).toBe("ACTIVE");
    expect(result.masterAccount.accountId).toBe("master-pilot-001");
    expect(result.masterAccount.active).toBe(true);
    expect(result.agentAccounts).toHaveLength(2);
    expect(result.agentAccounts[0].agentId).toBe("agent-pilot-001-001");
    expect(result.agentAccounts[0].purpose).toBe("payment-processing");
    expect(result.agentAccounts[1].agentId).toBe("agent-pilot-001-002");
    expect(result.agentAccounts[1].purpose).toBe("reconciliation");
  });

  test("onboards all 3 pilot customers from SC Ventures network", () => {
    const results = PILOT_CUSTOMERS.map((c) => service.onboardCustomer(c.id));

    expect(results).toHaveLength(3);
    expect(results[0].customerName).toBe("TechCorp Singapore");
    expect(results[1].customerName).toBe("FinanceHub Asia");
    expect(results[2].customerName).toBe("TradeFlow Pte Ltd");

    // Each has master + 2 agents
    for (const r of results) {
      expect(r.masterAccount.active).toBe(true);
      expect(r.agentAccounts).toHaveLength(2);
      expect(r.status).toBe("ACTIVE");
    }
  });

  test("returns existing result on duplicate onboard call", () => {
    const first = service.onboardCustomer("pilot-001");
    const second = service.onboardCustomer("pilot-001");
    expect(second).toBe(first);
  });

  test("throws for unknown customer id", () => {
    expect(() => service.onboardCustomer("pilot-999")).toThrow(
      "Unknown pilot customer: pilot-999",
    );
  });

  // ── recordTransaction ────────────────────────────────────────────

  test("records a live transaction for an agent", () => {
    service.onboardCustomer("pilot-001");
    const txn: TransactionRecord = service.recordTransaction(
      "pilot-001",
      "agent-pilot-001-001",
      50000,
    );

    expect(txn.transactionId).toBe("txn-pilot-001-001");
    expect(txn.customerId).toBe("pilot-001");
    expect(txn.agentId).toBe("agent-pilot-001-001");
    expect(txn.amountSgdCents).toBe(50000);
    expect(txn.status).toBe("COMPLETED");
  });

  test("throws on transaction for non-onboarded customer", () => {
    expect(() =>
      service.recordTransaction("pilot-001", "agent-pilot-001-001", 1000),
    ).toThrow("Customer pilot-001 not onboarded");
  });

  test("throws on transaction for unknown agent", () => {
    service.onboardCustomer("pilot-001");
    expect(() =>
      service.recordTransaction("pilot-001", "agent-unknown", 1000),
    ).toThrow("Agent agent-unknown not found for customer pilot-001");
  });

  test("rejects non-positive or non-integer amounts", () => {
    service.onboardCustomer("pilot-002");
    expect(() =>
      service.recordTransaction("pilot-002", "agent-pilot-002-001", 0),
    ).toThrow("Amount must be a positive integer (SGD cents)");
    expect(() =>
      service.recordTransaction("pilot-002", "agent-pilot-002-001", -100),
    ).toThrow("Amount must be a positive integer (SGD cents)");
    expect(() =>
      service.recordTransaction("pilot-002", "agent-pilot-002-001", 99.5),
    ).toThrow("Amount must be a positive integer (SGD cents)");
  });

  // ── getOnboardingStatus ──────────────────────────────────────────

  test("returns PENDING for non-onboarded customer", () => {
    expect(service.getOnboardingStatus("pilot-001")).toBe("PENDING");
  });

  test("returns ACTIVE after onboarding", () => {
    service.onboardCustomer("pilot-001");
    expect(service.getOnboardingStatus("pilot-001")).toBe("ACTIVE");
  });

  test("auto-completes status when transaction + feedback exist", () => {
    service.onboardCustomer("pilot-001");
    service.recordTransaction("pilot-001", "agent-pilot-001-001", 10000);
    service.collectFeedback("pilot-001", 9, "Great experience");
    expect(service.getOnboardingStatus("pilot-001")).toBe("COMPLETED");
  });

  // ── collectFeedback ──────────────────────────────────────────────

  test("collects NPS feedback for onboarded customer", () => {
    service.onboardCustomer("pilot-003");
    const fb: FeedbackRecord = service.collectFeedback(
      "pilot-003",
      8,
      "Smooth onboarding process",
    );

    expect(fb.customerId).toBe("pilot-003");
    expect(fb.nps).toBe(8);
    expect(fb.comment).toBe("Smooth onboarding process");
    expect(fb.collectedAt).toBeInstanceOf(Date);
  });

  test("rejects NPS outside 0-10 range", () => {
    service.onboardCustomer("pilot-001");
    expect(() => service.collectFeedback("pilot-001", -1, "bad")).toThrow(
      "NPS must be an integer between 0 and 10",
    );
    expect(() => service.collectFeedback("pilot-001", 11, "too high")).toThrow(
      "NPS must be an integer between 0 and 10",
    );
    expect(() => service.collectFeedback("pilot-001", 7.5, "decimal")).toThrow(
      "NPS must be an integer between 0 and 10",
    );
  });

  test("throws feedback for non-onboarded customer", () => {
    expect(() =>
      service.collectFeedback("pilot-001", 8, "test"),
    ).toThrow("Customer pilot-001 not onboarded");
  });

  // ── generatePilotReport ──────────────────────────────────────────

  test("generates empty report when no customers onboarded", () => {
    const report: PilotReport = service.generatePilotReport();
    expect(report.customersOnboarded).toBe(0);
    expect(report.totalTransactions).toBe(0);
    expect(report.averageNps).toBeNull();
    expect(report.customers).toHaveLength(0);
  });

  test("generates full pilot report with all 3 customers completing lifecycle", () => {
    // Onboard all 3
    for (const c of PILOT_CUSTOMERS) {
      service.onboardCustomer(c.id);
    }

    // Each customer executes at least 1 transaction
    service.recordTransaction("pilot-001", "agent-pilot-001-001", 50000);
    service.recordTransaction("pilot-001", "agent-pilot-001-002", 25000);
    service.recordTransaction("pilot-002", "agent-pilot-002-001", 100000);
    service.recordTransaction("pilot-003", "agent-pilot-003-001", 75000);

    // Collect feedback from 2 of 3
    service.collectFeedback("pilot-001", 9, "Excellent");
    service.collectFeedback("pilot-002", 8, "Good");

    const report = service.generatePilotReport();

    expect(report.customersOnboarded).toBe(3);
    expect(report.totalTransactions).toBe(4);
    expect(report.totalVolumeSgdCents).toBe(250000);
    expect(report.feedbackCount).toBe(2);
    expect(report.averageNps).toBe(8.5);

    // pilot-001 and pilot-002 have txn + feedback → COMPLETED
    const p1 = report.customers.find((c) => c.id === "pilot-001");
    expect(p1?.status).toBe("COMPLETED");
    expect(p1?.transactionCount).toBe(2);
    expect(p1?.volumeSgdCents).toBe(75000);
    expect(p1?.nps).toBe(9);

    // pilot-003 has txn but no feedback → ACTIVE
    const p3 = report.customers.find((c) => c.id === "pilot-003");
    expect(p3?.status).toBe("ACTIVE");
    expect(p3?.nps).toBeNull();

    // Completed count
    expect(report.customersCompleted).toBe(2);
    expect(report.customersActive).toBe(1);
  });
});
