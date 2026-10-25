import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { CompanyWorkspace, CompanyCharter } from '@helicraft/alhena';
import { ActionPanel, Button, FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import type { SelectedPlayer } from '../player-picker';
import { CompanyCharterEditor } from './charter-editor';
import { CompanyCharterSummary } from './charter-summary';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyGovernanceWorkspace({
  workspace,
  actorId,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; actorId: string; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [charter, setCharter] = useState<CompanyCharter>(workspace.content.charter);
  const players = useMemo((): SelectedPlayer[] => [], []);
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const review = useCallback((): void => {
    propose({ kind: 'AMEND_CHARTER', content: { ...workspace.content, charter } });
  }, [workspace.content, charter, propose]);
  return (
    <section>
      <h2>{uiText(locale, 'Корпоративное управление', 'Corporate governance')}</h2>
      {workspace.availableActions.includes('AMEND_CHARTER') && (
        <ActionPanel
          title={uiText(locale, 'Подготовить изменение устава', 'Prepare charter amendment')}
        >
          <FieldHelp
            showLabel
            label={uiText(locale, 'Назначения отдельными решениями', 'Separate appointments')}
            content={uiText(
              locale,
              'Изменение устава не назначает должностных лиц. Используйте отдельное назначение; первоначальные назначения остаются в истории учреждения.',
              'Charter amendments do not appoint officers. Use a separate appointment decision; initial appointments remain part of formation history.',
            )}
          />
          <CompanyCharterEditor
            value={charter}
            actorId={actorId}
            players={players}
            onChange={setCharter}
            formation={false}
          />
          <Button onClick={review}>
            {uiText(locale, 'Проверить изменение устава', 'Review charter amendment')}
          </Button>
        </ActionPanel>
      )}
      <ActionPanel title={uiText(locale, 'Действующий устав', 'Current charter')}>
        <CompanyCharterSummary charter={workspace.content.charter} />
      </ActionPanel>
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanyGovernanceWorkspace };
