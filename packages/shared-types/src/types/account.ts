import { z } from "zod";

export enum AccountType {
  OPERATING = "OPERATING",
  SETTLEMENT = "SETTLEMENT",
  ESCROW = "ESCROW",
  RESERVE = "RESERVE",
}

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
  SUSPENDED = "SUSPENDED",
}

export interface Account {
  id: string;
  agent_id: string;
  account_type: AccountType;
  status: AccountStatus;
  balance_sgd_cents: number; // SGD cents (integer)
  currency: string; // "SGD"
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const AccountTypeSchema = z.enum([
  AccountType.OPERATING,
  AccountType.SETTLEMENT,
  AccountType.ESCROW,
  AccountType.RESERVE,
]);

export const AccountStatusSchema = z.enum([
  AccountStatus.ACTIVE,
  AccountStatus.FROZEN,
  AccountStatus.CLOSED,
  AccountStatus.SUSPENDED,
]);

export const AccountSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  account_type: AccountTypeSchema,
  status: AccountStatusSchema,
  balance_sgd_cents: z.number().int().nonnegative(),
  currency: z.literal("SGD"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AccountType_Inferred = z.infer<typeof AccountSchema>;
