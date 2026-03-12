export type MaturityStageId = 'RULE_ONLY' | 'ASSISTED' | 'BOUNDED' | 'PORTFOLIO';

export interface MaturityStage {
  id: MaturityStageId;
  name: string;
  description: string;
  requirements: string[];
  auto_policies: string[];
}

const MATURITY_STAGES: MaturityStage[] = [
  {
    id: 'RULE_ONLY',
    name: 'Rule-only: All actions pre-approved',
    description: 'All actions require predefined approvals and strict policy gating.',
    requirements: ['KYA verified', 'Policy configured'],
    auto_policies: ['deny_all_except_configured'],
  },
  {
    id: 'ASSISTED',
    name: 'Assisted: Recommendations + approval',
    description: 'System recommends actions while humans approve high-impact decisions.',
    requirements: ['30 days history', 'Zero disputes'],
    auto_policies: ['allow_low_risk_auto', 'require_approval_high_risk'],
  },
  {
    id: 'BOUNDED',
    name: 'Bounded: Auto within limits',
    description: 'Automation executes low-risk actions within enterprise capability bounds.',
    requirements: ['90 days history', 'Settlement success > 99%'],
    auto_policies: ['allow_within_capability_bounds', 'auto_execute_low_risk'],
  },
  {
    id: 'PORTFOLIO',
    name: 'Portfolio: Portfolio-level auto',
    description: 'Portfolio-level automation enables cross-agent optimization and execution.',
    requirements: ['180 days history', 'Dispute win rate > 95%'],
    auto_policies: ['portfolio_level_auto', 'cross_agent_coordination_allowed'],
  },
];

const STAGE_ORDER: MaturityStageId[] = MATURITY_STAGES.map((stage) => stage.id);

export class MaturityLadderService {
  private readonly enterpriseStages = new Map<string, MaturityStageId>();

  getCurrentStage(enterpriseId: string): MaturityStageId {
    const existingStage = this.enterpriseStages.get(enterpriseId);
    if (existingStage) {
      return existingStage;
    }

    this.enterpriseStages.set(enterpriseId, 'RULE_ONLY');
    return 'RULE_ONLY';
  }

  setStage(enterpriseId: string, stage: MaturityStageId): void {
    this.enterpriseStages.set(enterpriseId, stage);
  }

  getNextStageRequirements(enterpriseId: string): string[] {
    const currentStage = this.getCurrentStage(enterpriseId);
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const nextStage = MATURITY_STAGES[currentIndex + 1];

    if (!nextStage) {
      return [];
    }

    return [...nextStage.requirements];
  }

  transition(
    enterpriseId: string,
    toStage: MaturityStageId,
  ): { success: boolean; auto_policies_applied: string[] } {
    const currentStage = this.getCurrentStage(enterpriseId);
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const targetIndex = STAGE_ORDER.indexOf(toStage);

    if (targetIndex !== currentIndex + 1) {
      return { success: false, auto_policies_applied: [] };
    }

    this.enterpriseStages.set(enterpriseId, toStage);
    const stage = MATURITY_STAGES[targetIndex];

    return {
      success: true,
      auto_policies_applied: stage ? [...stage.auto_policies] : [],
    };
  }

  getAllStages(): MaturityStage[] {
    return MATURITY_STAGES.map((stage) => ({
      ...stage,
      requirements: [...stage.requirements],
      auto_policies: [...stage.auto_policies],
    }));
  }
}
