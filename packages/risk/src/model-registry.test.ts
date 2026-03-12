import { describe, expect, it } from "bun:test";
import { ModelRegistry } from "./model-registry";

describe("ModelRegistry", () => {
  it("registers a model as pending approval with default shadow traffic", () => {
    const registry = new ModelRegistry();

    const model = registry.register({
      id: "risk-v1",
      name: "Risk Core",
      version: "1.0.0",
      type: "RISK",
      owner: "risk-team",
    });

    expect(model.status).toBe("PENDING_APPROVAL");
    expect(model.shadow_traffic_pct).toBe(0);
    expect(model.created_at).toBeInstanceOf(Date);
  });

  it("rejects invalid semver versions on register", () => {
    const registry = new ModelRegistry();

    expect(() =>
      registry.register({
        id: "risk-invalid",
        name: "Risk Invalid",
        version: "v1",
        type: "RISK",
        owner: "risk-team",
      })
    ).toThrow("MODEL_VERSION_INVALID");
  });

  it("approves model and exposes it as active", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "aml-v1",
      name: "AML Monitor",
      version: "1.2.3",
      type: "AML",
      owner: "aml-team",
    });

    const approved = registry.approve("aml-v1");
    const active = registry.getActive("AML");

    expect(approved.status).toBe("APPROVED");
    expect(approved.approved_at).toBeInstanceOf(Date);
    expect(active?.id).toBe("aml-v1");
  });

  it("enforces approval gate for shadow traffic", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "policy-v1",
      name: "Policy Guard",
      version: "1.0.0",
      type: "POLICY",
      owner: "policy-team",
    });

    expect(() => registry.setShadowTraffic("policy-v1", 10)).toThrow("MODEL_NOT_APPROVED");
  });

  it("updates shadow traffic for approved model", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "policy-v2",
      name: "Policy Guard V2",
      version: "2.0.0",
      type: "POLICY",
      owner: "policy-team",
    });
    registry.approve("policy-v2");

    const updated = registry.setShadowTraffic("policy-v2", 100);

    expect(updated.shadow_traffic_pct).toBe(100);
  });

  it("validates shadow traffic percentage bounds", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "score-v1",
      name: "Scoring Model",
      version: "1.0.0",
      type: "SCORING",
      owner: "scoring-team",
    });
    registry.approve("score-v1");

    expect(() => registry.setShadowTraffic("score-v1", -1)).toThrow("MODEL_SHADOW_TRAFFIC_INVALID");
    expect(() => registry.setShadowTraffic("score-v1", 101)).toThrow("MODEL_SHADOW_TRAFFIC_INVALID");
  });

  it("kills model immediately and records kill metadata", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "risk-v2",
      name: "Risk Core V2",
      version: "2.0.0",
      type: "RISK",
      owner: "risk-team",
    });
    registry.approve("risk-v2");

    const killed = registry.kill("risk-v2", "false positive spike");

    expect(killed.status).toBe("KILLED");
    expect(killed.killed_at).toBeInstanceOf(Date);
    expect(killed.kill_reason).toBe("false positive spike");
  });

  it("falls back to most recent approved model when active model is killed", () => {
    const registry = new ModelRegistry();

    registry.register({
      id: "risk-v1",
      name: "Risk Core V1",
      version: "1.0.0",
      type: "RISK",
      owner: "risk-team",
    });
    registry.approve("risk-v1");

    registry.register({
      id: "risk-v2",
      name: "Risk Core V2",
      version: "2.0.0",
      type: "RISK",
      owner: "risk-team",
    });
    registry.approve("risk-v2");

    const activeBeforeKill = registry.getActive("RISK");
    const killed = registry.kill("risk-v2", "rollback to prior version");
    const activeAfterKill = registry.getActive("RISK");

    expect(activeBeforeKill?.id).toBe("risk-v2");
    expect(killed.status).toBe("KILLED");
    expect(activeAfterKill?.id).toBe("risk-v1");
    expect(activeAfterKill?.status).toBe("APPROVED");
  });

  it("returns undefined active model when no approved models exist", () => {
    const registry = new ModelRegistry();
    registry.register({
      id: "aml-pending",
      name: "AML Pending",
      version: "0.1.0",
      type: "AML",
      owner: "aml-team",
    });

    expect(registry.getActive("AML")).toBeUndefined();
  });
});
