import type { DecisionRecord } from "./schema";

// ---------------------------------------------------------------------------
// Enums / Literals
// ---------------------------------------------------------------------------

export type DataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "RESTRICTED";

export type AuditRole = "OPERATOR" | "AUDITOR" | "ADMIN";

// ---------------------------------------------------------------------------
// Data Retention Config
// ---------------------------------------------------------------------------

export const DataRetentionConfig = {
  /** MAS requirement: 7-year retention for financial decision records */
  decisionRecordYears: 7,
  /** Operational log retention */
  logRetentionYears: 2,
} as const;

// ---------------------------------------------------------------------------
// PDPA (Singapore Personal Data Protection Act) Compliance Checklist
// ---------------------------------------------------------------------------

export const PDPA_CHECKLIST = [
  "Obtain consent before collecting personal data",
  "Notify individuals of purpose for data collection",
  "Limit collection to data necessary for identified purpose",
  "Restrict use of personal data to collected purpose",
  "Ensure accuracy of personal data",
  "Implement security arrangements to protect personal data",
  "Limit retention of personal data to business/legal need",
  "Provide access to personal data upon request",
  "Allow correction of personal data upon request",
  "Designate a Data Protection Officer (DPO)",
  "Establish data breach notification procedures",
  "Maintain Do Not Call (DNC) registry compliance",
  "Implement cross-border data transfer safeguards",
] as const;

// ---------------------------------------------------------------------------
// PII Masker
// ---------------------------------------------------------------------------

/**
 * PII Masker — auto-masks personally identifiable information in strings.
 *
 * Handles:
 *  - Full names: "John Doe" → "J*** D**"
 *  - Account numbers: "1234567890" → "****7890"
 *  - Addresses: "123 Orchard Road" → "*** Orchard Road"
 */
export class PiiMasker {
  /**
   * Mask a full name. Each word gets first letter + asterisks.
   * "John Doe" → "J*** D**"
   */
  maskName(name: string): string {
    if (!name.trim()) return name;
    return name
      .split(/\s+/)
      .map((word) => {
        if (word.length <= 1) return word;
        return word[0] + "*".repeat(word.length - 1);
      })
      .join(" ");
  }

  /**
   * Mask an account number. Shows only last 4 digits.
   * "1234567890" → "****7890"
   */
  maskAccountNumber(account: string): string {
    if (!account.trim()) return account;
    const digits = account.replace(/\D/g, "");
    if (digits.length <= 4) return account;
    return "*".repeat(digits.length - 4) + digits.slice(-4);
  }

  /**
   * Mask an address. Replaces the leading number portion with asterisks.
   * "123 Orchard Road" → "*** Orchard Road"
   */
  maskAddress(address: string): string {
    if (!address.trim()) return address;
    // Replace leading digits/number with asterisks of same length
    return address.replace(/^\d+/, (match) => "*".repeat(match.length));
  }

  /**
   * Auto-mask a log string by applying all PII patterns.
   * Detects and masks:
   *  - Account-like numbers (6+ digit sequences)
   *  - Address-like patterns (number + street words)
   */
  maskLogString(log: string): string {
    let masked = log;

    // Mask account-like numbers (sequences of 6+ digits)
    masked = masked.replace(/\b\d{6,}\b/g, (match) => {
      if (match.length <= 4) return match;
      return "*".repeat(match.length - 4) + match.slice(-4);
    });

    // Mask address-like patterns: digits followed by street-type words
    masked = masked.replace(
      /\b(\d{1,5})\s+([\w]+\s+(?:Road|Street|Avenue|Lane|Drive|Blvd|Boulevard|Way|Place|Crescent|Terrace|Close|Court|Park|Hill|Valley|View|Garden|Square))\b/gi,
      (_, digits: string, rest: string) => "*".repeat(digits.length) + " " + rest,
    );

    return masked;
  }
}

// ---------------------------------------------------------------------------
// Data Classification Service
// ---------------------------------------------------------------------------

/**
 * Classifies data fields into sensitivity levels per the organisation's
 * data governance framework.
 *
 * Classification rules:
 *  - RESTRICTED: PII fields (name, NRIC, account_number, address, phone, email)
 *  - CONFIDENTIAL: Financial fields (balance, amount, salary, transaction)
 *  - INTERNAL: Operational fields (agent_id, trace_id, status, policy_version)
 *  - PUBLIC: Everything else (timestamps, currency codes, health-check data)
 */
export class DataClassificationService {
  private static readonly RESTRICTED_PATTERNS = [
    "name",
    "nric",
    "account_number",
    "address",
    "phone",
    "email",
    "ssn",
    "passport",
    "dob",
    "date_of_birth",
  ];

  private static readonly CONFIDENTIAL_PATTERNS = [
    "balance",
    "amount",
    "salary",
    "transaction",
    "payment",
    "income",
    "credit",
    "debit",
  ];

  private static readonly INTERNAL_PATTERNS = [
    "agent_id",
    "trace_id",
    "status",
    "policy_version",
    "model_version",
    "case_id",
    "reason_code",
  ];

  /**
   * Classify a single field name into a DataClassification level.
   */
  classify(fieldName: string): DataClassification {
    const lower = fieldName.toLowerCase();

    for (const pattern of DataClassificationService.RESTRICTED_PATTERNS) {
      if (lower.includes(pattern)) return "RESTRICTED";
    }

    for (const pattern of DataClassificationService.CONFIDENTIAL_PATTERNS) {
      if (lower.includes(pattern)) return "CONFIDENTIAL";
    }

    for (const pattern of DataClassificationService.INTERNAL_PATTERNS) {
      if (lower.includes(pattern)) return "INTERNAL";
    }

    return "PUBLIC";
  }

  /**
   * Classify all fields of a record, returning a map of field → classification.
   */
  classifyRecord(
    record: Record<string, unknown>,
  ): Record<string, DataClassification> {
    const result: Record<string, DataClassification> = {};
    for (const key of Object.keys(record)) {
      result[key] = this.classify(key);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Audit Access Control
// ---------------------------------------------------------------------------

/**
 * Role-based audit log access control.
 *
 * Access levels:
 *  - OPERATOR: sees masked PII fields (for day-to-day operations)
 *  - AUDITOR: sees full data (for compliance investigations)
 *  - ADMIN: sees full data (system administration)
 */
export class AuditAccessControl {
  private readonly masker = new PiiMasker();
  private readonly classifier = new DataClassificationService();

  /**
   * Return a decision record filtered by role.
   * - OPERATOR: RESTRICTED and CONFIDENTIAL fields are masked
   * - AUDITOR / ADMIN: full access
   */
  filterDecisionRecord(
    record: DecisionRecord,
    role: AuditRole,
  ): Record<string, unknown> {
    if (role === "AUDITOR" || role === "ADMIN") {
      // Full access — return as-is (spread to plain object)
      return { ...record };
    }

    // OPERATOR: mask sensitive fields in input_snapshot
    const maskedSnapshot: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record.input_snapshot)) {
      const classification = this.classifier.classify(key);
      if (
        (classification === "RESTRICTED" || classification === "CONFIDENTIAL") &&
        typeof value === "string"
      ) {
        maskedSnapshot[key] = this.maskFieldByClassification(
          key,
          value,
          classification,
        );
      } else {
        maskedSnapshot[key] = value;
      }
    }

    return {
      ...record,
      input_snapshot: maskedSnapshot,
      // Mask override_actor if present (contains PII — actor name)
      override_actor: record.override_actor
        ? this.masker.maskName(record.override_actor)
        : null,
    };
  }

  /**
   * Check whether a role has full (unmasked) access.
   */
  hasFullAccess(role: AuditRole): boolean {
    return role === "AUDITOR" || role === "ADMIN";
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private maskFieldByClassification(
    key: string,
    value: string,
    classification: DataClassification,
  ): string {
    if (classification === "RESTRICTED") {
      const lower = key.toLowerCase();
      if (lower.includes("account")) return this.masker.maskAccountNumber(value);
      if (lower.includes("address")) return this.masker.maskAddress(value);
      if (lower.includes("name")) return this.masker.maskName(value);
      if (lower.includes("phone") || lower.includes("email")) {
        return this.masker.maskName(value); // generic masking
      }
      return this.masker.maskName(value);
    }
    // CONFIDENTIAL — mask numeric-looking values
    if (/^\d+$/.test(value)) {
      return this.masker.maskAccountNumber(value);
    }
    return "***";
  }
}
