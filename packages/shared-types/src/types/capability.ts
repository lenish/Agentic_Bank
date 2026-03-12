import { z } from "zod";

export enum CapabilityAction {
  TRANSFER = "TRANSFER",
  PAYMENT = "PAYMENT",
  WITHDRAWAL = "WITHDRAWAL",
  DEPOSIT = "DEPOSIT",
  DISPUTE = "DISPUTE",
  REFUND = "REFUND",
}

export interface Capability {
  id: string;
  agent_id: string;
  action: CapabilityAction[];
  amount_limit_sgd_cents: number; // SGD cents (integer)
  counterparty_scope: string[]; // List of allowed counterparty IDs or patterns
  ttl_seconds: number; // Time-to-live in seconds
  max_frequency_per_hour: number; // Maximum number of uses per hour
  revocable: boolean; // Can be revoked by agent
  non_transferable: boolean; // Always true for Phase 1
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const CapabilityActionSchema = z.enum([
  CapabilityAction.TRANSFER,
  CapabilityAction.PAYMENT,
  CapabilityAction.WITHDRAWAL,
  CapabilityAction.DEPOSIT,
  CapabilityAction.DISPUTE,
  CapabilityAction.REFUND,
]);

export const CapabilitySchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  action: z.array(CapabilityActionSchema).min(1),
  amount_limit_sgd_cents: z.number().int().positive(),
  counterparty_scope: z.array(z.string()).min(1),
  ttl_seconds: z.number().int().positive(),
  max_frequency_per_hour: z.number().int().positive(),
  revocable: z.boolean(),
  non_transferable: z.literal(true), // Always true for Phase 1
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CapabilityType = z.infer<typeof CapabilitySchema>;
