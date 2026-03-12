import { z } from "zod";

export interface PolicyRule {
  id: string;
  name: string;
  condition: Record<string, unknown>; // JSON condition object
  action: string; // Action to take if condition matches
  priority: number; // Higher priority rules evaluated first
}

export interface PolicyVersion {
  version: number;
  rules: PolicyRule[];
  created_at: string; // ISO 8601
  effective_from: string; // ISO 8601
  effective_to?: string; // ISO 8601 (optional, null if current)
}

export interface Policy {
  id: string;
  agent_id: string;
  name: string;
  description?: string;
  versions: PolicyVersion[];
  current_version: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export const PolicyRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  condition: z.record(z.unknown()),
  action: z.string().min(1),
  priority: z.number().int().nonnegative(),
});

export const PolicyVersionSchema = z.object({
  version: z.number().int().positive(),
  rules: z.array(PolicyRuleSchema),
  created_at: z.string().datetime(),
  effective_from: z.string().datetime(),
  effective_to: z.string().datetime().optional(),
});

export const PolicySchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  versions: z.array(PolicyVersionSchema).min(1),
  current_version: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PolicyRuleType = z.infer<typeof PolicyRuleSchema>;
export type PolicyVersionType = z.infer<typeof PolicyVersionSchema>;
export type PolicyType = z.infer<typeof PolicySchema>;
