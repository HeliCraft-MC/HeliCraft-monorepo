// oxlint-disable import/max-dependencies -- Corporate workspace navigation composes separate product sections over one protected legal identity and current capability projection.
import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyOverview } from './overview';
import { CompanyGovernanceWorkspace } from './governance-workspace';
import { CompanyOfficesWorkspace } from './offices-workspace';
import { CompanyOwnershipWorkspace } from './ownership-workspace';
import { CompanySubsidiariesWorkspace } from './subsidiaries-workspace';
import { CompanyDecisionsList } from './decisions-list';
import { CompanyEntityVoting } from './company-entity-voting';
import { CompanyFinanceWorkspace } from './finance-workspace';
import { CompanyBranchesWorkspace } from './branches-workspace';
import { CompanyShareHistory } from './share-history';
import { CompanyLifecycleHistory } from './lifecycle-history';
import { CompanySettingsWorkspace } from './settings-workspace';

const COMPANY_SECTIONS = [
  'overview',
  'governance',
  'offices',
  'ownership',
  'decisions',
  'finance',
  'subsidiaries',
  'branches',
  'history',
  'settings',
] as const;
type CompanySection = (typeof COMPANY_SECTIONS)[number];
function CompanyWorkspaceSection({
  section,
  workspace,
  actorId,
  players,
  onSaved,
  shareOperationId,
  formationDraftId,
  votingId,
}: Readonly<{
  section: CompanySection;
  workspace: CompanyWorkspace;
  actorId: string;
  players: readonly SelectedPlayer[];
  onSaved: () => void;
  shareOperationId?: string;
  formationDraftId?: string;
  votingId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  if (section === 'governance') {
    return (
      <CompanyGovernanceWorkspace
        key={workspace.currentRevisionId}
        workspace={workspace}
        actorId={actorId}
        onSaved={onSaved}
      />
    );
  }
  if (section === 'offices') {
    return (
      <CompanyOfficesWorkspace
        key={workspace.currentRevisionId}
        workspace={workspace}
        players={players}
        onSaved={onSaved}
      />
    );
  }
  if (section === 'ownership') {
    return (
      <CompanyOwnershipWorkspace
        workspace={workspace}
        shareOperationId={shareOperationId}
        onSaved={onSaved}
      />
    );
  }
  if (section === 'decisions') {
    return (
      <>
        <CompanyEntityVoting workspace={workspace} votingId={votingId} onSaved={onSaved} />
        <CompanyDecisionsList companyId={workspace.id} actorId={actorId} />
      </>
    );
  }
  if (section === 'finance') {
    return workspace.canReadFinance ? (
      <CompanyFinanceWorkspace workspace={workspace} actorId={actorId} />
    ) : (
      <Alert>
        {uiText(
          locale,
          'Для просмотра финансов требуется отдельное полномочие компании.',
          'Company financial access requires separate charter authority.',
        )}
      </Alert>
    );
  }
  if (section === 'subsidiaries') {
    return (
      <CompanySubsidiariesWorkspace
        workspace={workspace}
        actorId={actorId}
        draftId={formationDraftId}
        onSaved={onSaved}
      />
    );
  }
  if (section === 'branches') {
    return <CompanyBranchesWorkspace workspace={workspace} actorId={actorId} />;
  }
  if (section === 'history') {
    return (
      <>
        <CompanyDecisionsList companyId={workspace.id} actorId={actorId} />
        <CompanyShareHistory companyId={workspace.id} actorId={actorId} />
        <CompanyLifecycleHistory companyId={workspace.id} actorId={actorId} />
      </>
    );
  }
  if (section === 'settings') {
    return (
      <CompanySettingsWorkspace
        key={workspace.currentRevisionId}
        workspace={workspace}
        onSaved={onSaved}
      />
    );
  }
  return <CompanyOverview workspace={workspace} />;
}
export { CompanyWorkspaceSection, COMPANY_SECTIONS, type CompanySection };
