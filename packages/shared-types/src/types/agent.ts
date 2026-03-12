import { z } from "zod";

export enum AgentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  REVOKED = "REVOKED",
}

export enum KYAStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  kya_status: KYAStatus;
  kya_data?: Record<string, unknown>;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const AgentStatusSchema = z.enum([
  AgentStatus.ACTIVE,
  AgentStatus.INACTIVE,
  AgentStatus.SUSPENDED,
  AgentStatus.REVOKED,
]);

export const KYAStatusSchema = z.enum([
  KYAStatus.PENDING,
  KYAStatus.VERIFIED,
  KYAStatus.REJECTED,
  KYAStatus.EXPIRED,
]);

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: AgentStatusSchema,
  kya_status: KYAStatusSchema,
  kya_data: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AgentType = z.infer<typeof AgentSchema>;
