import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCompanyDraft, saveCompanyDraft } from '@helicraft/alhena';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button, FieldHelp } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function SubsidiaryComposer({
  workspace,
}: Readonly<{ workspace: CompanyWorkspace }>): ReactElement {
  const { locale } = useTranslation();
  const mutation = useMutation({
    mutationFn: async () => {
      const initial = await createCompanyDraft({
        client: browserClient(),
        body: { title: uiText(locale, 'Проект дочерней компании', 'Subsidiary draft') },
        throwOnError: true,
      });
      const draft = initial.data;
      const result = await saveCompanyDraft({
        client: browserClient(),
        path: { id: draft.id },
        body: {
          version: draft.version,
          title: draft.title,
          step: 0,
          configuration: {
            ...draft.configuration,
            registrationStateId: workspace.registrationStateId,
            allocations: [
              {
                owner: { type: 'COMPANY', id: workspace.id },
                shares: draft.configuration.totalShares,
              },
            ],
          },
        },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { mutate } = mutation;
  const create = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section>
      <h3>{uiText(locale, 'Учредить дочернюю компанию', 'Found a subsidiary')}</h3>
      <FieldHelp
        label={uiText(locale, 'Отдельная юридическая идентичность', 'Separate legal identity')}
        content={uiText(
          locale,
          'Это создаст только ваш проект. В мастере можно изменить государство, доли и управление. До регистрации компания-учредитель должна отдельно согласиться со всеми сохранёнными условиями через свой Governance.',
          'This creates your draft only. The wizard can change jurisdiction, ownership and governance. Before registration the founding company must separately approve all saved terms through its own Governance.',
        )}
      />
      <Button onClick={create} disabled={mutation.isPending}>
        {uiText(locale, 'Подготовить проект дочерней компании', 'Prepare subsidiary draft')}
      </Button>
      {mutation.data !== undefined && (
        <a href={`/app/companies/drafts/${mutation.data.id}`}>
          {uiText(locale, 'Открыть мастер дочерней компании', 'Open subsidiary wizard')}
        </a>
      )}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </section>
  );
}
export { SubsidiaryComposer };
