export const CAPABILITY_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type CapabilityStatus = (typeof CAPABILITY_STATUS)[keyof typeof CAPABILITY_STATUS];

export const CAPABILITY_AUDIT_EVENT = {
  ISSUED: "ISSUED",
  USED: "USED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export type CapabilityAuditEventType =
  (typeof CAPABILITY_AUDIT_EVENT)[keyof typeof CAPABILITY_AUDIT_EVENT];

export interface CapabilityToken {
  id: string;
  agent_id: string;
  principal_id: string;
  action_set: string[];
  amount_limit_sgd_cents: number;
  counterparty_scope: string[];
  ttl_seconds: number;
  max_frequency_per_hour: number;
  non_transferable: true;
  revocable: boolean;
  issued_at: Date;
  expires_at: Date;
  revoked_at?: Date;
  status: CapabilityStatus;
}

export interface CapabilityIssueInput {
  agent_id: string;
  principal_id: string;
  action_set: string[];
  amount_limit_sgd_cents: number;
  counterparty_scope: string[];
  ttl_seconds: number;
  max_frequency_per_hour: number;
  non_transferable?: boolean;
  revocable: boolean;
}

export interface CapabilityVerifyInput {
  capability_id: string;
  action: string;
  amount_sgd_cents: number;
  counterparty_id: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface CapabilityAuditLogEntry {
  capability_id: string;
  event: CapabilityAuditEventType;
  timestamp: Date;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export class CapabilityTokenService {
  // TODO: Replace with PostgreSQL-backed store in production.
  private readonly capabilities = new Map<string, CapabilityToken>();
  private readonly usageAmounts = new Map<string, number>();
  private readonly usageTimestamps = new Map<string, number[]>();
  private readonly auditLog: CapabilityAuditLogEntry[] = [];

  issue(input: CapabilityIssueInput, actor?: string, metadata?: Record<string, unknown>): CapabilityToken {
    this.validateIssueInput(input);

    const now = Date.now();
    const issuedAt = new Date(now);
    const capabilityId = crypto.randomUUID();

    const capability: CapabilityToken = {
      id: capabilityId,
      agent_id: input.agent_id,
      principal_id: input.principal_id,
      action_set: [...new Set(input.action_set)],
      amount_limit_sgd_cents: input.amount_limit_sgd_cents,
      counterparty_scope: [...new Set(input.counterparty_scope)],
      ttl_seconds: input.ttl_seconds,
      max_frequency_per_hour: input.max_frequency_per_hour,
      non_transferable: true,
      revocable: input.revocable,
      issued_at: issuedAt,
      expires_at: new Date(now + input.ttl_seconds * 1000),
      status: CAPABILITY_STATUS.ACTIVE,
    };

    this.capabilities.set(capability.id, capability);
    this.usageAmounts.set(capability.id, 0);
    this.usageTimestamps.set(capability.id, []);
    this.appendAudit({
      capability_id: capability.id,
      event: CAPABILITY_AUDIT_EVENT.ISSUED,
      timestamp: issuedAt,
      actor,
      metadata,
    });

    return this.cloneCapability(capability);
  }

  verify(input: CapabilityVerifyInput): CapabilityToken {
    this.validateVerifyInput(input);

    const capability = this.requireCapability(input.capability_id);
    this.ensureActiveCapability(capability);

    if (!capability.action_set.includes(input.action)) {
      throw new Error("CAPABILITY_ACTION_NOT_ALLOWED");
    }

    if (!capability.counterparty_scope.includes(input.counterparty_id)) {
      throw new Error("CAPABILITY_COUNTERPARTY_NOT_ALLOWED");
    }

    const currentUsageAmount = this.usageAmounts.get(capability.id) ?? 0;
    if (currentUsageAmount + input.amount_sgd_cents > capability.amount_limit_sgd_cents) {
      throw new Error("CAPABILITY_AMOUNT_EXCEEDED");
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const existingTimestamps = this.usageTimestamps.get(capability.id) ?? [];
    const recentTimestamps = existingTimestamps.filter((timestamp) => timestamp >= oneHourAgo);
    if (recentTimestamps.length >= capability.max_frequency_per_hour) {
      throw new Error("CAPABILITY_FREQUENCY_EXCEEDED");
    }

    recentTimestamps.push(now);
    this.usageTimestamps.set(capability.id, recentTimestamps);
    this.usageAmounts.set(capability.id, currentUsageAmount + input.amount_sgd_cents);

    this.appendAudit({
      capability_id: capability.id,
      event: CAPABILITY_AUDIT_EVENT.USED,
      timestamp: new Date(now),
      actor: input.actor,
      metadata: {
        ...(input.metadata ?? {}),
        action: input.action,
        amount_sgd_cents: input.amount_sgd_cents,
        counterparty_id: input.counterparty_id,
      },
    });

    return this.cloneCapability(capability);
  }

  revoke(capabilityId: string, actor?: string, metadata?: Record<string, unknown>): CapabilityToken {
    const capability = this.requireCapability(capabilityId);
    this.ensureExpiredIfNeeded(capability);

    if (!capability.revocable) {
      throw new Error("CAPABILITY_NOT_REVOCABLE");
    }

    if (capability.status === CAPABILITY_STATUS.REVOKED) {
      return this.cloneCapability(capability);
    }

    const now = new Date();
    capability.status = CAPABILITY_STATUS.REVOKED;
    capability.revoked_at = now;

    this.appendAudit({
      capability_id: capability.id,
      event: CAPABILITY_AUDIT_EVENT.REVOKED,
      timestamp: now,
      actor,
      metadata,
    });

    return this.cloneCapability(capability);
  }

  getById(capabilityId: string): CapabilityToken | undefined {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      return undefined;
    }

    this.ensureExpiredIfNeeded(capability);
    return this.cloneCapability(capability);
  }

  getAuditLog(capabilityId?: string): CapabilityAuditLogEntry[] {
    const filtered = capabilityId
      ? this.auditLog.filter((entry) => entry.capability_id === capabilityId)
      : this.auditLog;
    return filtered.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp.getTime()),
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  getUsedAmount(capabilityId: string): number {
    return this.usageAmounts.get(capabilityId) ?? 0;
  }

  private appendAudit(entry: CapabilityAuditLogEntry): void {
    this.auditLog.push(entry);
  }

  private requireCapability(capabilityId: string): CapabilityToken {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error("CAPABILITY_NOT_FOUND");
    }

    return capability;
  }

  private ensureActiveCapability(capability: CapabilityToken): void {
    this.ensureExpiredIfNeeded(capability);

    if (capability.status === CAPABILITY_STATUS.REVOKED) {
      throw new Error("CAPABILITY_REVOKED");
    }

    if (capability.status === CAPABILITY_STATUS.EXPIRED) {
      throw new Error("CAPABILITY_EXPIRED");
    }
  }

  private ensureExpiredIfNeeded(capability: CapabilityToken): void {
    if (capability.status !== CAPABILITY_STATUS.ACTIVE) {
      return;
    }

    const expiresAt = capability.issued_at.getTime() + capability.ttl_seconds * 1000;
    if (expiresAt < Date.now()) {
      capability.status = CAPABILITY_STATUS.EXPIRED;
      this.appendAudit({
        capability_id: capability.id,
        event: CAPABILITY_AUDIT_EVENT.EXPIRED,
        timestamp: new Date(),
      });
    }
  }

  private validateIssueInput(input: CapabilityIssueInput): void {
    if (!input.agent_id.trim()) {
      throw new Error("CAPABILITY_AGENT_ID_REQUIRED");
    }

    if (!input.principal_id.trim()) {
      throw new Error("CAPABILITY_PRINCIPAL_ID_REQUIRED");
    }

    if (input.action_set.length === 0 || input.action_set.some((action) => !action.trim())) {
      throw new Error("CAPABILITY_ACTION_SET_INVALID");
    }

    if (!Number.isInteger(input.amount_limit_sgd_cents) || input.amount_limit_sgd_cents <= 0) {
      throw new Error("CAPABILITY_AMOUNT_LIMIT_INVALID");
    }

    if (input.counterparty_scope.some((counterparty) => !counterparty.trim())) {
      throw new Error("CAPABILITY_COUNTERPARTY_SCOPE_INVALID");
    }

    if (!Number.isInteger(input.ttl_seconds) || input.ttl_seconds <= 0) {
      throw new Error("CAPABILITY_TTL_INVALID");
    }

    if (!Number.isInteger(input.max_frequency_per_hour) || input.max_frequency_per_hour <= 0) {
      throw new Error("CAPABILITY_MAX_FREQUENCY_INVALID");
    }

    if (input.non_transferable === false) {
      throw new Error("CAPABILITY_NON_TRANSFERABLE_REQUIRED");
    }
  }

  private validateVerifyInput(input: CapabilityVerifyInput): void {
    if (!input.capability_id.trim()) {
      throw new Error("CAPABILITY_ID_REQUIRED");
    }

    if (!input.action.trim()) {
      throw new Error("CAPABILITY_ACTION_REQUIRED");
    }

    if (!Number.isInteger(input.amount_sgd_cents) || input.amount_sgd_cents <= 0) {
      throw new Error("CAPABILITY_AMOUNT_INVALID");
    }

    if (!input.counterparty_id.trim()) {
      throw new Error("CAPABILITY_COUNTERPARTY_REQUIRED");
    }
  }

  private cloneCapability(capability: CapabilityToken): CapabilityToken {
    return {
      ...capability,
      action_set: [...capability.action_set],
      counterparty_scope: [...capability.counterparty_scope],
      issued_at: new Date(capability.issued_at.getTime()),
      expires_at: new Date(capability.expires_at.getTime()),
      revoked_at: capability.revoked_at ? new Date(capability.revoked_at.getTime()) : undefined,
    };
  }
}
