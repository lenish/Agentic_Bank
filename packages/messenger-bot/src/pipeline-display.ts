/**
 * PipelineDisplay: OMO-style 5-stage text formatter for Telegram
 * Formats: ✅ Intent Parse (12ms) → ⏳ Policy Check → ⬜ Risk Score → ⬜ Settlement Execute → ⬜ Audit Record
 */

export type StageStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR";

export interface PipelineStage {
  readonly name: string;
  readonly status: StageStatus;
  readonly elapsed_ms?: number;
  readonly reason?: string;
}

export class PipelineDisplay {
  /**
   * Format pipeline stages into OMO-style text representation for Telegram.
   * Status symbols:
   * - ✅ DONE
   * - ⏳ RUNNING
   * - ⬜ PENDING
   * - ❌ ERROR
   */
  format(stages: readonly PipelineStage[]): string {
    const lines = stages.map((stage) => {
      const symbol = this.getSymbol(stage.status);
      const elapsed = stage.elapsed_ms !== undefined ? ` (${stage.elapsed_ms}ms)` : "";
      const reason = stage.reason ? ` — ${stage.reason}` : "";
      return `${symbol} ${stage.name}${elapsed}${reason}`;
    });

    return lines.join("\n");
  }

  private getSymbol(status: StageStatus): string {
    switch (status) {
      case "DONE":
        return "✅";
      case "RUNNING":
        return "⏳";
      case "PENDING":
        return "⬜";
      case "ERROR":
        return "❌";
      default:
        return "⬜";
    }
  }
}
