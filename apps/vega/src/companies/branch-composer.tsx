// oxlint-disable import/max-dependencies -- Branch registration selects the actual host policy and pins its revision to the exact localized corporate proposal.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublishedCompanyRegistrationPolicy } from '@helicraft/alhena';
import type { CompanyWorkspace, CompanyBranchSummary } from '@helicraft/alhena';
import { ActionPanel, Alert, Button, FieldHelp } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyJurisdictionPicker } from './jurisdiction-picker';
import { PolicyTerms } from './policy-terms';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyBranchComposer({
  workspace,
  branch,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  branch?: CompanyBranchSummary;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [stateId, setStateId] = useState<string | null>(branch?.stateId ?? null);
  const [name, setName] = useState(branch?.name ?? {});
  const [description, setDescription] = useState(branch?.description ?? {});
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const policy = useQuery({
    queryKey: ['company-registration-policy', stateId],
    enabled: stateId !== null,
    queryFn: async () => {
      if (stateId === null) {
        return null;
      }
      const result = await getPublishedCompanyRegistrationPolicy({
        client: createClient({ credentials: 'omit' }),
        path: { id: stateId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const review = useCallback((): void => {
    if (stateId !== null && policy.data !== null && policy.data !== undefined) {
      propose({
        kind: 'REGISTER_BRANCH',
        branchId: branch?.id ?? crypto.randomUUID(),
        stateId,
        policyRevisionId: policy.data.id,
        name,
        description,
      });
    }
  }, [stateId, policy.data, branch?.id, name, description, propose]);
  return (
    <ActionPanel
      title={
        branch === undefined
          ? uiText(locale, 'Открыть филиал', 'Open a branch')
          : uiText(locale, 'Повторная регистрация филиала', 'Resubmit branch registration')
      }
    >
      {branch === undefined && (
        <CompanyJurisdictionPicker
          value={stateId}
          onChange={setStateId}
          label={uiText(locale, 'Государство присутствия', 'Host jurisdiction')}
        />
      )}
      <LocalizedInputField
        label={uiText(locale, 'Название филиала', 'Branch name')}
        value={name}
        onChange={setName}
      />
      <LocalizedInputField
        label={uiText(locale, 'Описание филиала', 'Branch description')}
        value={description}
        onChange={setDescription}
        multiline
      />
      <FieldHelp
        showLabel
        label={uiText(locale, 'Правовой статус филиала', 'Branch legal status')}
        content={uiText(
          locale,
          'Филиал не является отдельным юридическим лицом и не получает отдельный счёт. Государство присутствия может потребовать своё одобрение. Повторная заявка сохраняет идентификатор филиала.',
          'A branch is not a separate legal entity and has no separate account. The host may require its own approval. Resubmission preserves the branch identity.',
        )}
      />
      {policy.data !== null && policy.data !== undefined && (
        <PolicyTerms policy={policy.data.policy} />
      )}
      {stateId !== null && policy.data === null && (
        <Alert>
          {uiText(
            locale,
            'Правила государства ещё не утверждены.',
            'The host has not adopted a registration policy.',
          )}
        </Alert>
      )}
      {policy.error !== null && (
        <Alert tone="danger">
          {uiText(locale, 'Не удалось загрузить правила.', 'Could not load the host policy.')}
        </Alert>
      )}
      <Button
        onClick={review}
        disabled={
          policy.data === null ||
          policy.data === undefined ||
          policy.data.policy.branchMode === 'DENY' ||
          (stateId !== workspace.registrationStateId &&
            policy.data.policy.foreignBranches === 'DENY')
        }
      >
        {uiText(locale, 'Проверить регистрацию филиала', 'Review branch registration')}
      </Button>
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </ActionPanel>
  );
}
export { CompanyBranchComposer };
