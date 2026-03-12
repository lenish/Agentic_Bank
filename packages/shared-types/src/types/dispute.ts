import { z } from "zod";

export enum DisputeStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
  ESCALATED = "ESCALATED",
}

export interface DisputeCase {
  id: string;
  transaction_id: string;
  agent_id: string;
  status: DisputeStatus;
  reason: string; // Reason for dispute
  evidence?: Record<string, unknown>; // Supporting evidence
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const DisputeStatusSchema = z.enum([
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.RESOLVED,
  DisputeStatus.CLOSED,
  DisputeStatus.ESCALATED,
]);

export const DisputeCaseSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  status: DisputeStatusSchema,
  reason: z.string().min(1),
  evidence: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type DisputeCaseType = z.infer<typeof DisputeCaseSchema>;
