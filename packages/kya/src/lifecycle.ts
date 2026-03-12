import { InMemoryAgentStore } from "./store";

export const KYA_STATES = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type KYAState = (typeof KYA_STATES)[keyof typeof KYA_STATES];

const ALLOWED_TRANSITIONS: Record<KYAState, ReadonlySet<KYAState>> = {
  [KYA_STATES.PENDING]: new Set([KYA_STATES.VERIFIED, KYA_STATES.EXPIRED, KYA_STATES.REVOKED]),
  [KYA_STATES.VERIFIED]: new Set([KYA_STATES.EXPIRED, KYA_STATES.REVOKED]),
  [KYA_STATES.EXPIRED]: new Set([KYA_STATES.REVOKED]),
  [KYA_STATES.REVOKED]: new Set(),
};

export class KYAStateMachine {
  constructor(private readonly store: InMemoryAgentStore) {}

  getState(agentId: string): KYAState {
    return this.store.getLifecycleState(agentId) ?? KYA_STATES.PENDING;
  }

  transition(agentId: string, targetState: KYAState): KYAState {
    const currentState = this.getState(agentId);

    if (currentState === KYA_STATES.REVOKED) {
      throw new Error("revoked agents are permanently blocked from state transitions");
    }

    if (currentState === KYA_STATES.EXPIRED && targetState === KYA_STATES.VERIFIED) {
      throw new Error("expired agents require re-verification and cannot transition directly to VERIFIED");
    }

    if (!ALLOWED_TRANSITIONS[currentState].has(targetState)) {
      throw new Error(`invalid transition: ${currentState} -> ${targetState}`);
    }

    this.store.setLifecycleState(agentId, targetState);
    return targetState;
  }
}
