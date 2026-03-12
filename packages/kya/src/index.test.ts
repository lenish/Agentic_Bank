import { describe, expect, test } from "bun:test";
import {
  AgentIdentity,
  InMemoryAgentStore,
  KYA_STATES,
  KYAStateMachine,
  STEP_UP_AMOUNT_THRESHOLD,
  StepUpAuth,
} from "./index";

describe("AgentIdentity", () => {
  test("issues SPIFFE ID with expiry claim and validates format", () => {
    const identity = new AgentIdentity("test-secret");

    const issued = identity.issue("agent-001", "owner-abc");
    const claims = identity.verify(issued.svid);

    expect(issued.spiffeId).toBe("spiffe://aoa.local/agent/agent-001");
    expect(claims.spiffe_id).toBe("spiffe://aoa.local/agent/agent-001");
    expect(claims.sub).toBe("agent-001");
    expect(claims.owner_id).toBe("owner-abc");
    expect(claims.exp).toBeGreaterThan(claims.iat);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("rejects revoked agent SVID", () => {
    const identity = new AgentIdentity("test-secret");
    const issued = identity.issue("agent-002", "owner-def");

    identity.revoke("agent-002");

    expect(() => identity.verify(issued.svid)).toThrow("agent is revoked");
  });
});

describe("KYAStateMachine", () => {
  test("allows PENDING -> VERIFIED -> REVOKED transitions", () => {
    const machine = new KYAStateMachine(new InMemoryAgentStore());

    expect(machine.transition("agent-003", KYA_STATES.VERIFIED)).toBe(KYA_STATES.VERIFIED);
    expect(machine.transition("agent-003", KYA_STATES.REVOKED)).toBe(KYA_STATES.REVOKED);
  });

  test("throws on REVOKED -> VERIFIED transition", () => {
    const machine = new KYAStateMachine(new InMemoryAgentStore());

    machine.transition("agent-004", KYA_STATES.REVOKED);

    expect(() => machine.transition("agent-004", KYA_STATES.VERIFIED)).toThrow(
      "revoked agents are permanently blocked from state transitions",
    );
  });
});

describe("StepUpAuth", () => {
  test("triggers step-up on high amount and new counterparty", () => {
    const stepUp = new StepUpAuth();

    expect(stepUp.requiresStepUp("TRANSFER", STEP_UP_AMOUNT_THRESHOLD + 1, false)).toBe(true);
    expect(stepUp.requiresStepUp("TRANSFER", 50_00, true)).toBe(true);
    expect(stepUp.requiresStepUp("HIGH_RISK_ACTION", 50_00, false)).toBe(true);
  });

  test("does not trigger step-up on normal transfer", () => {
    const stepUp = new StepUpAuth();

    expect(stepUp.requiresStepUp("TRANSFER", 50_00, false)).toBe(false);
  });
});
