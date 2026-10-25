import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createCompanyDraft, listCompanyDrafts } from '@helicraft/alhena';
import { PageHeader, Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from './companies.module.scss';
import { CompanyDraftWithdrawal } from './draft-withdrawal';
import { CompanyWorkspaceDirectory } from './workspace-directory';

function CompanyDraftsList({ actorId }: Readonly<{ actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-drafts', actorId],
    queryFn: async () => {
      const result = await listCompanyDrafts({ client: browserClient(), throwOnError: true });
      return result.data.items;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await createCompanyDraft({
        client: browserClient(),
        body: { title: uiText(locale, 'Новая компания', 'New company') },
        throwOnError: true,
      });
      return result.data;
    },
    onSuccess: async () => {
      await refetch();
    },
  });
  const { mutate } = mutation;
  const create = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section className={styles.page}>
      <PageHeader title={uiText(locale, 'Мои компании и проекты', 'My companies and drafts')} />
      <a href="/app/shares">
        {uiText(locale, 'Мои доли и участие в компаниях', 'My shares and company participation')}
      </a>
      <a href="/app/notifications">
        {uiText(locale, 'Открыть входящие согласования', 'Open approval inbox')}
      </a>
      <CompanyWorkspaceDirectory actorId={actorId} />
      <Button onClick={create} disabled={mutation.isPending}>
        {uiText(locale, 'Учредить компанию', 'Form a company')}
      </Button>
      {mutation.data !== undefined && (
        <a href={`/app/companies/drafts/${mutation.data.id}`}>
          {uiText(locale, 'Открыть новый проект', 'Open new draft')}
        </a>
      )}
      {(query.error !== null || mutation.error !== null) && (
        <Alert tone="danger">{errorMessage(query.error ?? mutation.error)}</Alert>
      )}
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data?.length === 0 && <p>{uiText(locale, 'Проектов пока нет.', 'No drafts yet.')}</p>}
      <ul>
        {query.data?.map((draft) => (
          <li key={draft.id}>
            <a href={`/app/companies/drafts/${draft.id}`}>
              {displayText(draft.configuration.name, locale) ||
                draft.title ||
                uiText(locale, 'Без названия', 'Untitled')}
            </a>{' '}
            ·{' '}
            {draft.submittedApplicationId === null
              ? uiText(locale, 'Черновик', 'Draft')
              : uiText(locale, 'Подан', 'Submitted')}
            {draft.submittedApplicationId === null && (
              <CompanyDraftWithdrawal draft={draft} onSaved={refresh} />
            )}
          </li>
        ))}
      </ul>
      <a href="/companies">
        {uiText(locale, 'Публичный каталог компаний', 'Public company directory')}
      </a>
    </section>
  );
}
export { CompanyDraftsList };
