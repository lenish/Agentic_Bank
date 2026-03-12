import { useState } from 'react';
import type { MaturityStage } from './maturity-service';
import { MaturityLadderService } from './maturity-service';

interface MaturityLadderProps {
  enterpriseId: string;
  service: MaturityLadderService;
}

export function MaturityLadder({ enterpriseId, service }: MaturityLadderProps) {
  const [, setVersion] = useState(0);
  const stages = service.getAllStages();
  const currentStageId = service.getCurrentStage(enterpriseId);
  const currentStageIndex = stages.findIndex((stage) => stage.id === currentStageId);
  const nextStage = stages[currentStageIndex + 1];
  const nextRequirements = service.getNextStageRequirements(enterpriseId);

  const handleUpgrade = () => {
    if (!nextStage) {
      return;
    }

    const result = service.transition(enterpriseId, nextStage.id);
    if (result.success) {
      setVersion((current) => current + 1);
    }
  };

  return (
    <section className="maturity-ladder">
      <h3 className="maturity-ladder-title">Maturity Ladder</h3>
      <div className="maturity-stages">
        {stages.map((stage) => {
          const className =
            stage.id === currentStageId ? 'maturity-stage current' : 'maturity-stage';

          return (
            <article key={stage.id} className={className}>
              <h4 className="maturity-stage-name">{stage.name}</h4>
              <p className="maturity-stage-description">{stage.description}</p>
              <StagePolicies stage={stage} />
            </article>
          );
        })}
      </div>

      <div className="maturity-next-stage">
        <h4 className="maturity-next-stage-title">Next Stage Requirements</h4>
        {nextRequirements.length > 0 ? (
          <ul className="maturity-next-stage-requirements">
            {nextRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        ) : (
          <p className="maturity-next-stage-complete">Top maturity stage reached.</p>
        )}

        {nextStage && (
          <button type="button" onClick={handleUpgrade}>
            Upgrade
          </button>
        )}
      </div>
    </section>
  );
}

function StagePolicies({ stage }: { stage: MaturityStage }) {
  return (
    <div className="maturity-stage-policies">
      <strong>Auto policies</strong>
      <ul>
        {stage.auto_policies.map((policy) => (
          <li key={policy}>{policy}</li>
        ))}
      </ul>
    </div>
  );
}
