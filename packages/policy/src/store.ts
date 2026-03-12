import type { PolicyVersion } from "./schema";

export interface PolicyStore {
  upsertVersion(policyVersion: Omit<PolicyVersion, "created_at"> & { created_at?: Date }): PolicyVersion;
  getCurrentVersion(policyId: string): PolicyVersion | null;
  getVersion(policyId: string, version: string): PolicyVersion | null;
  setCurrentVersion(policyId: string, version: string): void;
  listVersions(policyId: string): PolicyVersion[];
}

interface VersionedPolicyState {
  versions: Map<string, PolicyVersion>;
  current_version: string;
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

class InMemoryPolicyStore implements PolicyStore {
  // TODO: Replace with PostgreSQL-backed policy store in production.
  private readonly policies = new Map<string, VersionedPolicyState>();

  upsertVersion(policyVersion: Omit<PolicyVersion, "created_at"> & { created_at?: Date }): PolicyVersion {
    this.validatePolicyVersion(policyVersion.policy_id, policyVersion.version);

    const policyState = this.policies.get(policyVersion.policy_id) ?? {
      versions: new Map<string, PolicyVersion>(),
      current_version: policyVersion.version,
    };

    if (policyState.versions.has(policyVersion.version)) {
      throw new Error("POLICY_VERSION_ALREADY_EXISTS");
    }

    const createdAt = policyVersion.created_at ?? new Date();
    const storedVersion: PolicyVersion = {
      policy_id: policyVersion.policy_id,
      version: policyVersion.version,
      created_at: new Date(createdAt.getTime()),
      effective_from: new Date(policyVersion.effective_from.getTime()),
      effective_to: policyVersion.effective_to
        ? new Date(policyVersion.effective_to.getTime())
        : undefined,
      rules: policyVersion.rules.map((rule) => ({
        ...rule,
        action_types: rule.action_types ? [...rule.action_types] : undefined,
        counterparty_whitelist: rule.counterparty_whitelist
          ? [...rule.counterparty_whitelist]
          : undefined,
      })),
    };

    policyState.versions.set(storedVersion.version, storedVersion);
    policyState.current_version = storedVersion.version;
    this.policies.set(storedVersion.policy_id, policyState);

    return this.cloneVersion(storedVersion);
  }

  getCurrentVersion(policyId: string): PolicyVersion | null {
    const policyState = this.policies.get(policyId);
    if (!policyState) {
      return null;
    }

    const currentVersion = policyState.versions.get(policyState.current_version);
    if (!currentVersion) {
      return null;
    }

    return this.cloneVersion(currentVersion);
  }

  getVersion(policyId: string, version: string): PolicyVersion | null {
    const policyState = this.policies.get(policyId);
    if (!policyState) {
      return null;
    }

    const storedVersion = policyState.versions.get(version);
    if (!storedVersion) {
      return null;
    }

    return this.cloneVersion(storedVersion);
  }

  setCurrentVersion(policyId: string, version: string): void {
    const policyState = this.policies.get(policyId);
    if (!policyState) {
      throw new Error("POLICY_NOT_FOUND");
    }

    if (!policyState.versions.has(version)) {
      throw new Error("POLICY_VERSION_NOT_FOUND");
    }

    policyState.current_version = version;
  }

  listVersions(policyId: string): PolicyVersion[] {
    const policyState = this.policies.get(policyId);
    if (!policyState) {
      return [];
    }

    return [...policyState.versions.values()]
      .sort((left, right) => left.created_at.getTime() - right.created_at.getTime())
      .map((version) => this.cloneVersion(version));
  }

  private validatePolicyVersion(policyId: string, version: string): void {
    if (!policyId.trim()) {
      throw new Error("POLICY_ID_REQUIRED");
    }

    if (!SEMVER_REGEX.test(version)) {
      throw new Error("POLICY_VERSION_INVALID");
    }
  }

  private cloneVersion(version: PolicyVersion): PolicyVersion {
    return {
      policy_id: version.policy_id,
      version: version.version,
      created_at: new Date(version.created_at.getTime()),
      effective_from: new Date(version.effective_from.getTime()),
      effective_to: version.effective_to ? new Date(version.effective_to.getTime()) : undefined,
      rules: version.rules.map((rule) => ({
        ...rule,
        action_types: rule.action_types ? [...rule.action_types] : undefined,
        counterparty_whitelist: rule.counterparty_whitelist
          ? [...rule.counterparty_whitelist]
          : undefined,
      })),
    };
  }
}

export function createPolicyStore(): PolicyStore {
  return new InMemoryPolicyStore();
}
