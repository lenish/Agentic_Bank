import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MaturityLadderService } from './maturity-service';
import { MaturityLadder } from './maturity-ladder';

describe('MaturityLadderService', () => {
  it('defaults enterprise stage to RULE_ONLY', () => {
    const service = new MaturityLadderService();
    expect(service.getCurrentStage('ent-1')).toBe('RULE_ONLY');
  });

  it('sets and gets current stage', () => {
    const service = new MaturityLadderService();
    service.setStage('ent-1', 'ASSISTED');

    expect(service.getCurrentStage('ent-1')).toBe('ASSISTED');
  });

  it('returns next stage requirements for current stage', () => {
    const service = new MaturityLadderService();

    expect(service.getNextStageRequirements('ent-1')).toEqual(['30 days history', 'Zero disputes']);
  });

  it('transitions forward by one stage and applies auto policies', () => {
    const service = new MaturityLadderService();

    const result = service.transition('ent-1', 'ASSISTED');
    expect(result).toEqual({
      success: true,
      auto_policies_applied: ['allow_low_risk_auto', 'require_approval_high_risk'],
    });
    expect(service.getCurrentStage('ent-1')).toBe('ASSISTED');
  });

  it('rejects backward transitions', () => {
    const service = new MaturityLadderService();
    service.setStage('ent-1', 'ASSISTED');

    const result = service.transition('ent-1', 'RULE_ONLY');
    expect(result).toEqual({ success: false, auto_policies_applied: [] });
    expect(service.getCurrentStage('ent-1')).toBe('ASSISTED');
  });

  it('rejects skip-stage forward transitions', () => {
    const service = new MaturityLadderService();

    const result = service.transition('ent-1', 'BOUNDED');
    expect(result).toEqual({ success: false, auto_policies_applied: [] });
    expect(service.getCurrentStage('ent-1')).toBe('RULE_ONLY');
  });

  it('returns empty requirements at top stage', () => {
    const service = new MaturityLadderService();
    service.setStage('ent-1', 'PORTFOLIO');

    expect(service.getNextStageRequirements('ent-1')).toEqual([]);
  });

  it('returns all four stages in order', () => {
    const service = new MaturityLadderService();
    const stages = service.getAllStages();

    expect(stages).toHaveLength(4);
    expect(stages.map((stage) => stage.id)).toEqual([
      'RULE_ONLY',
      'ASSISTED',
      'BOUNDED',
      'PORTFOLIO',
    ]);
  });
});

describe('MaturityLadder component', () => {
  it('renders four maturity stage cards', () => {
    const service = new MaturityLadderService();

    const html = renderToStaticMarkup(
      createElement(MaturityLadder, { enterpriseId: 'ent-1', service }),
    );
    expect(html.match(/class="maturity-stage(?: current)?"/g)?.length).toBe(4);
  });

  it('highlights current stage and shows next-stage requirements', () => {
    const service = new MaturityLadderService();

    const html = renderToStaticMarkup(
      createElement(MaturityLadder, { enterpriseId: 'ent-1', service }),
    );

    expect(html).toContain('class="maturity-stage current"><h4 class="maturity-stage-name">Rule-only: All actions pre-approved</h4>');
    expect(html).toContain('<li>30 days history</li>');
    expect(html).toContain('<li>Zero disputes</li>');
    expect(html).toContain('>Upgrade<');
  });

  it('reflects RULE_ONLY to ASSISTED transition in rendered output', () => {
    const service = new MaturityLadderService();
    const transitionResult = service.transition('ent-1', 'ASSISTED');
    expect(transitionResult.success).toBe(true);

    const html = renderToStaticMarkup(
      createElement(MaturityLadder, { enterpriseId: 'ent-1', service }),
    );

    expect(html).toContain('class="maturity-stage current"><h4 class="maturity-stage-name">Assisted: Recommendations + approval</h4>');
    expect(html).toContain('<li>90 days history</li>');
    expect(html).toContain('<li>Settlement success &gt; 99%</li>');
  });

  it('hides upgrade button at top maturity stage', () => {
    const service = new MaturityLadderService();
    service.setStage('ent-1', 'PORTFOLIO');

    const html = renderToStaticMarkup(
      createElement(MaturityLadder, { enterpriseId: 'ent-1', service }),
    );

    expect(html).not.toContain('>Upgrade<');
    expect(html).toContain('Top maturity stage reached.');
  });
});
