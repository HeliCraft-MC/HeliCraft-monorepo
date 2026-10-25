// oxlint-disable import/max-dependencies -- Registration outcome composition combines localized lifecycle reasons with immutable formation and resubmission controls.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCompanyRegistrationApplication, reopenCompanyDraft } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { companyLifecycleReason } from './lifecycle-reason';
import { CompanyFormationSummary } from './formation-summary';
import { companyRegistrationStatus } from './wizard-labels';
import styles from './companies.module.scss';

function CompanyApplicationPage({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-application', id, actorId],
    queryFn: async () => {
      const result = await getCompanyRegistrationApplication({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const reopen = useMutation({
    mutationFn: async () => {
      if (query.data === undefined) {
        return null;
      }
      const result = await reopenCompanyDraft({
        client: browserClient(),
        path: { id: query.data.draftId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const { mutate } = reopen;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  const revise = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Регистрационная заявка', 'Registration application')}</h1>
      <Button onClick={refresh} disabled={query.isFetching}>
        {uiText(locale, 'Обновить статус', 'Refresh status')}
      </Button>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <>
          <output>{companyRegistrationStatus(query.data.status, locale)}</output>
          {query.data.reason !== null && <p>{companyLifecycleReason(query.data.reason, locale)}</p>}
          <CompanyFormationSummary
            configuration={query.data.configuration}
            companyId={query.data.companyId}
            applicationId={query.data.id}
          />
          {query.data.status === 'APPROVED' && (
            <a href={`/app/companies/${query.data.companyId}`}>
              {uiText(locale, 'Открыть управление компанией', 'Open company workspace')}
            </a>
          )}
          {query.data.status === 'REJECTED' && query.data.applicantId === actorId && (
            <Button onClick={revise} disabled={reopen.isPending}>
              {uiText(locale, 'Исправить и подать заново', 'Revise and resubmit')}
            </Button>
          )}
        </>
      )}
      {reopen.data !== null && reopen.data !== undefined && (
        <a href={`/app/companies/drafts/${reopen.data.id}`}>
          {uiText(locale, 'Продолжить исправленный проект', 'Continue revised draft')}
        </a>
      )}
      {reopen.error !== null && <Alert tone="danger">{errorMessage(reopen.error)}</Alert>}
    </section>
  );
}
export { CompanyApplicationPage };
