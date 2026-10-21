import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { CompanySharePortfolio } from './portfolio';
import { SubsidiaryComposer } from './subsidiary-composer';
import { CompanyFoundingDecision } from './founding-decision';

function CompanySubsidiariesWorkspace({
  workspace,
  actorId,
  draftId,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  actorId: string;
  draftId?: string;
  onSaved: () => void;
}>): ReactElement {
  return (
    <section>
      <CompanyFoundingDecision workspace={workspace} draftId={draftId} onSaved={onSaved} />
      {workspace.availableActions.includes('FOUND_COMPANY') && (
        <SubsidiaryComposer workspace={workspace} />
      )}
      <CompanySharePortfolio workspace={workspace} actorId={actorId} />
    </section>
  );
}
export { CompanySubsidiariesWorkspace };
