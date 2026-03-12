import { describe, test, expect, beforeEach } from "bun:test";
import {
  PiiMasker,
  DataClassificationService,
  AuditAccessControl,
  DataRetentionConfig,
  PDPA_CHECKLIST,
} from "./privacy";
import type { DataClassification, AuditRole } from "./privacy";
import type { DecisionRecord } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecisionRecord(
  overrides?: Partial<DecisionRecord>,
): DecisionRecord {
  return {
    id: "rec-001",
    trace_id: "trace-001",
    agent_id: "agent-policy-001",
    input_snapshot: {
      customer_name: "John Doe",
      account_number: "1234567890",
      address: "123 Orchard Road",
      amount: 50000,
      currency: "SGD",
    },
    policy_version: "1.2.0",
    model_version: null,
    reason_codes: ["WITHIN_LIMIT"],
    outcome: "APPROVED",
    override_actor: null,
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PiiMasker
// ---------------------------------------------------------------------------

describe("PiiMasker", () => {
  let masker: PiiMasker;

  beforeEach(() => {
    masker = new PiiMasker();
  });

  test("maskName: 'John Doe' → 'J*** D**'", () => {
    expect(masker.maskName("John Doe")).toBe("J*** D**");
  });

  test("maskName: single character name preserved", () => {
    expect(masker.maskName("J")).toBe("J");
  });

  test("maskName: empty string returns empty", () => {
    expect(masker.maskName("")).toBe("");
  });

  test("maskAccountNumber: '1234567890' → '******7890'", () => {
    expect(masker.maskAccountNumber("1234567890")).toBe("******7890");
  });

  test("maskAccountNumber: short account (≤4 digits) returns original", () => {
    expect(masker.maskAccountNumber("1234")).toBe("1234");
  });

  test("maskAddress: '123 Orchard Road' → '*** Orchard Road'", () => {
    expect(masker.maskAddress("123 Orchard Road")).toBe("*** Orchard Road");
  });

  test("maskAddress: no leading digits returns unchanged", () => {
    expect(masker.maskAddress("Orchard Road")).toBe("Orchard Road");
  });

  test("maskLogString: masks account-like numbers in log text", () => {
    const log = "Transfer to account 1234567890 completed";
    const masked = masker.maskLogString(log);
    expect(masked).toContain("******7890");
    expect(masked).not.toContain("1234567890");
  });
});

// ---------------------------------------------------------------------------
// DataClassificationService
// ---------------------------------------------------------------------------

describe("DataClassificationService", () => {
  let classifier: DataClassificationService;

  beforeEach(() => {
    classifier = new DataClassificationService();
  });

  test("classify: 'customer_name' → RESTRICTED", () => {
    expect(classifier.classify("customer_name")).toBe("RESTRICTED");
  });

  test("classify: 'account_number' → RESTRICTED", () => {
    expect(classifier.classify("account_number")).toBe("RESTRICTED");
  });

  test("classify: 'balance_sgd_cents' → CONFIDENTIAL", () => {
    expect(classifier.classify("balance_sgd_cents")).toBe("CONFIDENTIAL");
  });

  test("classify: 'agent_id' → INTERNAL", () => {
    expect(classifier.classify("agent_id")).toBe("INTERNAL");
  });

  test("classify: 'currency' → PUBLIC", () => {
    expect(classifier.classify("currency")).toBe("PUBLIC");
  });

  test("classifyRecord: classifies all fields of a record", () => {
    const record = {
      customer_name: "John",
      amount: 5000,
      agent_id: "a-1",
      currency: "SGD",
    };
    const result = classifier.classifyRecord(record);
    expect(result.customer_name).toBe("RESTRICTED");
    expect(result.amount).toBe("CONFIDENTIAL");
    expect(result.agent_id).toBe("INTERNAL");
    expect(result.currency).toBe("PUBLIC");
  });
});

// ---------------------------------------------------------------------------
// AuditAccessControl
// ---------------------------------------------------------------------------

describe("AuditAccessControl", () => {
  let access: AuditAccessControl;

  beforeEach(() => {
    access = new AuditAccessControl();
  });

  test("OPERATOR: sees masked PII in decision record", () => {
    const record = makeDecisionRecord();
    const filtered = access.filterDecisionRecord(record, "OPERATOR");
    const snapshot = filtered.input_snapshot as Record<string, unknown>;

    // Name should be masked
    expect(snapshot.customer_name).toBe("J*** D**");
    // Account number should be masked
    expect(snapshot.account_number).toBe("******7890");
    // Address should be masked
    expect(snapshot.address).toBe("*** Orchard Road");
    // Non-PII preserved
    expect(snapshot.currency).toBe("SGD");
  });

  test("AUDITOR: sees full unmasked data", () => {
    const record = makeDecisionRecord();
    const filtered = access.filterDecisionRecord(record, "AUDITOR");
    const snapshot = filtered.input_snapshot as Record<string, unknown>;

    expect(snapshot.customer_name).toBe("John Doe");
    expect(snapshot.account_number).toBe("1234567890");
    expect(snapshot.address).toBe("123 Orchard Road");
  });

  test("ADMIN: sees full unmasked data", () => {
    const record = makeDecisionRecord();
    const filtered = access.filterDecisionRecord(record, "ADMIN");
    const snapshot = filtered.input_snapshot as Record<string, unknown>;

    expect(snapshot.customer_name).toBe("John Doe");
    expect(snapshot.account_number).toBe("1234567890");
  });

  test("OPERATOR: override_actor is masked when present", () => {
    const record = makeDecisionRecord({ override_actor: "Jane Smith" });
    const filtered = access.filterDecisionRecord(record, "OPERATOR");
    expect(filtered.override_actor).toBe("J*** S****");
  });

  test("hasFullAccess: OPERATOR → false, AUDITOR → true, ADMIN → true", () => {
    expect(access.hasFullAccess("OPERATOR")).toBe(false);
    expect(access.hasFullAccess("AUDITOR")).toBe(true);
    expect(access.hasFullAccess("ADMIN")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("DataRetentionConfig", () => {
  test("decision records retained for 7 years", () => {
    expect(DataRetentionConfig.decisionRecordYears).toBe(7);
  });

  test("logs retained for 2 years", () => {
    expect(DataRetentionConfig.logRetentionYears).toBe(2);
  });
});

describe("PDPA_CHECKLIST", () => {
  test("is a non-empty readonly array", () => {
    expect(Array.isArray(PDPA_CHECKLIST)).toBe(true);
    expect(PDPA_CHECKLIST.length).toBeGreaterThan(0);
  });

  test("includes consent and DPO requirements", () => {
    const items = PDPA_CHECKLIST as readonly string[];
    expect(items.some((i) => i.toLowerCase().includes("consent"))).toBe(true);
    expect(
      items.some((i) => i.toLowerCase().includes("data protection officer")),
    ).toBe(true);
  });
});
