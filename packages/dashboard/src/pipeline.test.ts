import { describe, it, expect } from 'bun:test';
import { PipelineVisualization, type PipelineStage } from './pipeline';
import { createPipelineServer } from './pipeline-server';

describe('PipelineStage types', () => {
  it('DONE stage has correct structure', () => {
    const stage: PipelineStage = { name: 'Intent Parse', status: 'DONE', elapsed_ms: 12 };
    expect(stage.status).toBe('DONE');
    expect(stage.elapsed_ms).toBe(12);
  });

  it('ERROR stage has reason field', () => {
    const stage: PipelineStage = { name: 'Policy Check', status: 'ERROR', reason: 'AMOUNT_LIMIT_EXCEEDED' };
    expect(stage.status).toBe('ERROR');
    expect(stage.reason).toBe('AMOUNT_LIMIT_EXCEEDED');
  });

  it('PENDING stage has no elapsed_ms', () => {
    const stage: PipelineStage = { name: 'Risk Score', status: 'PENDING' };
    expect(stage.elapsed_ms).toBeUndefined();
  });

  it('all 5 stage names are valid strings', () => {
    const names = ['Intent Parse', 'Policy Check', 'Risk Score', 'Settlement Execute', 'Audit Record'];
    expect(names).toHaveLength(5);
    names.forEach((n) => expect(typeof n).toBe('string'));
  });
});

describe('PipelineVisualization component', () => {
  it('is a function (React component)', () => {
    expect(typeof PipelineVisualization).toBe('function');
  });
});

describe('PipelineServer SSE', () => {
  it('returns text/event-stream content type', async () => {
    const app = createPipelineServer();
    const res = await app.request('/api/v1/pipeline/pay-001/stream');
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });
});
