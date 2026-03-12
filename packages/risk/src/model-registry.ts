const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export type ModelType = "RISK" | "AML" | "POLICY" | "SCORING";

export type ModelStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "KILLED"
  | "DEPRECATED";

export interface ModelRegistrationInput {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  owner: string;
  shadow_traffic_pct?: number;
}

export interface ModelRecord {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  status: ModelStatus;
  owner: string;
  created_at: Date;
  approved_at?: Date;
  killed_at?: Date;
  kill_reason?: string;
  shadow_traffic_pct: number;
}

export class ModelRegistry {
  private readonly modelsById = new Map<string, ModelRecord>();
  private readonly modelIdsByType = new Map<ModelType, string[]>();
  private readonly activeModelIdByType = new Map<ModelType, string>();

  register(model: ModelRegistrationInput): ModelRecord {
    this.assertNonEmpty(model.id, "MODEL_ID_REQUIRED");
    this.assertNonEmpty(model.name, "MODEL_NAME_REQUIRED");
    this.assertNonEmpty(model.owner, "MODEL_OWNER_REQUIRED");
    this.assertSemver(model.version);

    if (this.modelsById.has(model.id)) {
      throw new Error("MODEL_ALREADY_EXISTS");
    }

    const shadowTraffic = model.shadow_traffic_pct ?? 0;
    this.assertShadowTrafficPct(shadowTraffic);

    const created: ModelRecord = {
      id: model.id,
      name: model.name,
      version: model.version,
      type: model.type,
      status: "PENDING_APPROVAL",
      owner: model.owner,
      created_at: new Date(),
      shadow_traffic_pct: shadowTraffic,
    };

    this.modelsById.set(created.id, created);

    const existingIds = this.modelIdsByType.get(created.type) ?? [];
    this.modelIdsByType.set(created.type, [...existingIds, created.id]);

    return this.toPublicRecord(created);
  }

  approve(id: string): ModelRecord {
    const model = this.getRequiredModel(id);

    if (model.status === "KILLED") {
      throw new Error("MODEL_CANNOT_APPROVE_KILLED");
    }

    const now = new Date();
    model.status = "APPROVED";
    model.approved_at = now;
    model.killed_at = undefined;
    model.kill_reason = undefined;
    this.activeModelIdByType.set(model.type, model.id);

    return this.toPublicRecord(model);
  }

  reject(id: string, reason: string): ModelRecord {
    this.assertNonEmpty(reason, "MODEL_REJECTION_REASON_REQUIRED");
    const model = this.getRequiredModel(id);

    if (model.status === "KILLED") {
      throw new Error("MODEL_ALREADY_KILLED");
    }

    model.status = "REJECTED";

    if (this.activeModelIdByType.get(model.type) === model.id) {
      this.activeModelIdByType.delete(model.type);
    }

    return this.toPublicRecord(model);
  }

  kill(id: string, reason: string): ModelRecord {
    this.assertNonEmpty(reason, "MODEL_KILL_REASON_REQUIRED");
    const model = this.getRequiredModel(id);

    model.status = "KILLED";
    model.killed_at = new Date();
    model.kill_reason = reason;

    if (this.activeModelIdByType.get(model.type) === model.id) {
      const fallback = this.getMostRecentApprovedModel(model.type, model.id);
      if (fallback) {
        this.activeModelIdByType.set(model.type, fallback.id);
      } else {
        this.activeModelIdByType.delete(model.type);
      }
    }

    return this.toPublicRecord(model);
  }

  setShadowTraffic(id: string, pct: number): ModelRecord {
    this.assertShadowTrafficPct(pct);
    const model = this.getRequiredModel(id);

    if (model.status !== "APPROVED") {
      throw new Error("MODEL_NOT_APPROVED");
    }

    model.shadow_traffic_pct = pct;
    return this.toPublicRecord(model);
  }

  getActive(type: ModelType): ModelRecord | undefined {
    const activeId = this.activeModelIdByType.get(type);
    if (activeId) {
      const activeModel = this.modelsById.get(activeId);
      if (activeModel?.status === "APPROVED") {
        return this.toPublicRecord(activeModel);
      }
    }

    const fallback = this.getMostRecentApprovedModel(type);
    if (!fallback) {
      return undefined;
    }

    this.activeModelIdByType.set(type, fallback.id);
    return this.toPublicRecord(fallback);
  }

  getById(id: string): ModelRecord | undefined {
    const model = this.modelsById.get(id);
    if (!model) {
      return undefined;
    }

    return this.toPublicRecord(model);
  }

  list(): ModelRecord[] {
    return [...this.modelsById.values()]
      .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())
      .map((model) => this.toPublicRecord(model));
  }

  private getMostRecentApprovedModel(type: ModelType, excludingId?: string): ModelRecord | undefined {
    const modelIds = this.modelIdsByType.get(type) ?? [];
    const approvedModels = modelIds
      .map((modelId) => this.modelsById.get(modelId))
      .filter((model): model is ModelRecord => model !== undefined)
      .filter((model) => model.status === "APPROVED")
      .filter((model) => model.id !== excludingId)
      .sort((left, right) => {
        const leftApprovedAt = left.approved_at?.getTime() ?? 0;
        const rightApprovedAt = right.approved_at?.getTime() ?? 0;

        if (rightApprovedAt !== leftApprovedAt) {
          return rightApprovedAt - leftApprovedAt;
        }

        return right.created_at.getTime() - left.created_at.getTime();
      });

    return approvedModels[0];
  }

  private getRequiredModel(id: string): ModelRecord {
    const model = this.modelsById.get(id);
    if (!model) {
      throw new Error("MODEL_NOT_FOUND");
    }

    return model;
  }

  private assertSemver(version: string): void {
    this.assertNonEmpty(version, "MODEL_VERSION_REQUIRED");
    if (!SEMVER_PATTERN.test(version)) {
      throw new Error("MODEL_VERSION_INVALID");
    }
  }

  private assertShadowTrafficPct(pct: number): void {
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      throw new Error("MODEL_SHADOW_TRAFFIC_INVALID");
    }
  }

  private assertNonEmpty(value: string, errorCode: string): void {
    if (!value.trim()) {
      throw new Error(errorCode);
    }
  }

  private toPublicRecord(model: ModelRecord): ModelRecord {
    return {
      ...model,
      created_at: new Date(model.created_at),
      approved_at: model.approved_at ? new Date(model.approved_at) : undefined,
      killed_at: model.killed_at ? new Date(model.killed_at) : undefined,
    };
  }
}
