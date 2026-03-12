import React from 'react';

export interface PipelineStage {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  elapsed_ms?: number;
  reason?: string;
}

const STATUS_ICON: Record<PipelineStage['status'], string> = {
  PENDING: '⬜',
  RUNNING: '⏳',
  DONE: '✅',
  ERROR: '❌',
};

interface PipelineVisualizationProps {
  stages: PipelineStage[];
  title?: string;
}

export function PipelineVisualization({ stages, title }: PipelineVisualizationProps) {
  return (
    <div className="pipeline">
      {title && <h3 className="pipeline-title">{title}</h3>}
      {stages.map((stage, i) => (
        <div key={i} className={`pipeline-stage ${stage.status.toLowerCase()}`}>
          <span className="pipeline-stage-icon">{STATUS_ICON[stage.status]}</span>
          <span className="pipeline-stage-name">{stage.name}</span>
          {stage.elapsed_ms !== undefined && (
            <span className="pipeline-stage-time">({stage.elapsed_ms}ms)</span>
          )}
          {stage.reason && (
            <span className="pipeline-stage-reason"> — {stage.reason}</span>
          )}
        </div>
      ))}
    </div>
  );
}
