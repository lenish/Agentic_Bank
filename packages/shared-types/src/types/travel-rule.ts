import { z } from "zod";

// Minimal ISO 20022 message type stubs for Phase 1 (SGD-only)

export interface IVMS101Payload {
  originator: {
    name: string;
    address?: string;
    account_id: string;
  };
  beneficiary: {
    name: string;
    address?: string;
    account_id: string;
  };
  amount: number; // SGD cents (integer)
  currency: string; // "SGD"
  date: string; // ISO 8601
}

export interface Pain001Message {
  message_id: string;
  timestamp: string; // ISO 8601
  payload: Record<string, unknown>; // Placeholder for full pain.001 structure
}

export interface Pacs008Message {
  message_id: string;
  timestamp: string; // ISO 8601
  payload: Record<string, unknown>; // Placeholder for full pacs.008 structure
}

export interface Pacs002Message {
  message_id: string;
  timestamp: string; // ISO 8601
  payload: Record<string, unknown>; // Placeholder for full pacs.002 structure
}

export const IVMS101PayloadSchema = z.object({
  originator: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    account_id: z.string().min(1),
  }),
  beneficiary: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    account_id: z.string().min(1),
  }),
  amount: z.number().int().positive(),
  currency: z.literal("SGD"),
  date: z.string().datetime(),
});

export const Pain001MessageSchema = z.object({
  message_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export const Pacs008MessageSchema = z.object({
  message_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export const Pacs002MessageSchema = z.object({
  message_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export type IVMS101PayloadType = z.infer<typeof IVMS101PayloadSchema>;
export type Pain001MessageType = z.infer<typeof Pain001MessageSchema>;
export type Pacs008MessageType = z.infer<typeof Pacs008MessageSchema>;
export type Pacs002MessageType = z.infer<typeof Pacs002MessageSchema>;
