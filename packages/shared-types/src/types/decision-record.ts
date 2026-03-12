import { z } from "zod";

export interface DecisionRecord {
  id: string;
  transaction_id: string;
  agent_id: string;
  input_snapshot: Record<string, unknown>; // Full input state at decision time
  policy_version: number; // Policy version used for decision
  model_version: string; // ML model version used (if applicable)
  reason_codes: string[]; // List of reason codes explaining the decision
  outcome: "APPROVED" | "REJECTED" | "ESCALATED"; // Decision outcome
  override_actor?: string; // Actor ID if decision was overridden (optional)
  trace_id: string; // Distributed trace ID for debugging
  created_at: string; // ISO 8601
}

export const DecisionRecordSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  input_snapshot: z.record(z.unknown()),
  policy_version: z.number().int().nonnegative(),
  model_version: z.string().min(1),
  reason_codes: z.array(z.string()).min(1),
  outcome: z.enum(["APPROVED", "REJECTED", "ESCALATED"]),
  override_actor: z.string().uuid().optional(),
  trace_id: z.string().min(1),
  created_at: z.string().datetime(),
});

export type DecisionRecordType = z.infer<typeof DecisionRecordSchema>;
