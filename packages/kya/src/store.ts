import type { KYAState } from "./lifecycle";

export interface AgentAttribution {
  ownerId: string;
  attributedAt: Date;
}

export class InMemoryAgentStore {
  // TODO: Replace with PostgreSQL-backed repository.
  private readonly attributions = new Map<string, AgentAttribution>();
  private readonly revokedAgents = new Set<string>();
  private readonly lifecycleStates = new Map<string, KYAState>();

  setAttribution(agentId: string, ownerId: string): void {
    this.attributions.set(agentId, {
      ownerId,
      attributedAt: new Date(),
    });
  }

  getAttribution(agentId: string): AgentAttribution | undefined {
    return this.attributions.get(agentId);
  }

  isRevoked(agentId: string): boolean {
    return this.revokedAgents.has(agentId);
  }

  revokeAgent(agentId: string): void {
    this.revokedAgents.add(agentId);
  }

  setLifecycleState(agentId: string, state: KYAState): void {
    this.lifecycleStates.set(agentId, state);
  }

  getLifecycleState(agentId: string): KYAState | undefined {
    return this.lifecycleStates.get(agentId);
  }
}
