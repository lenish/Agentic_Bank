import { z } from "zod";

export enum TransactionStatus {
  INITIATED = "INITIATED",
  AUTHORIZED = "AUTHORIZED",
  HELD = "HELD",
  RELEASING = "RELEASING",
  SETTLED = "SETTLED",
  REFUNDED = "REFUNDED",
  DISPUTED = "DISPUTED",
}

export interface Transaction {
  id: string;
  agent_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_sgd_cents: number; // SGD cents (integer)
  status: TransactionStatus;
  reference: string; // Transaction reference/memo
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const TransactionStatusSchema = z.enum([
  TransactionStatus.INITIATED,
  TransactionStatus.AUTHORIZED,
  TransactionStatus.HELD,
  TransactionStatus.RELEASING,
  TransactionStatus.SETTLED,
  TransactionStatus.REFUNDED,
  TransactionStatus.DISPUTED,
]);

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount_sgd_cents: z.number().int().positive(),
  status: TransactionStatusSchema,
  reference: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type TransactionType = z.infer<typeof TransactionSchema>;
