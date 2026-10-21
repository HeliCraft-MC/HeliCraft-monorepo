// oxlint-disable import/max-dependencies -- Protected corporate review composes exact terms, generic Voting, immutable evidence and server-derived action controls.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyDecision } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { VotingCard } from '../states/voting-card';
import { TaxBreakdown } from '../taxation/breakdown';
import { CompanyDecisionPayloadSummary } from './decision-payload-summary';
import { CompanyDecisionControls } from './decision-controls';
import { companyActionLabel, companyStatusLabel } from './labels';
import styles from './companies.module.scss';

function CompanyDecisionPage({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-decision', id, actorId],
    queryFn: async () => {
      const result = await getCompanyDecision({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Корпоративное решение', 'Corporate decision')}</h1>
      <Button onClick={refresh} disabled={query.isFetching}>
        {uiText(locale, 'Обновить одобрения и результат', 'Refresh approvals and outcome')}
      </Button>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <>
          <a href={`/app/companies/${query.data.companyId}`}>
            {uiText(locale, 'Управление компанией', 'Company workspace')}
          </a>
          <h2>{companyActionLabel(query.data.kind, locale)}</h2>
          <p>{companyStatusLabel(query.data.status, locale)}</p>
          <CompanyDecisionPayloadSummary
            payload={query.data.payload}
            charter={query.data.charter}
          />
          {query.data.calculation !== undefined && (
            <TaxBreakdown calculation={query.data.calculation} code="" />
          )}
          <CompanyDecisionControls decision={query.data} actorId={actorId} onSaved={refresh} />
          <h3>{uiText(locale, 'Подписи должностных лиц', 'Office approvals')}</h3>
          <ul>
            {query.data.approvals.map((approval) => (
              <li key={approval.id}>
                {displayText(
                  query.data?.charter.offices.find((office) => office.id === approval.officeId)
                    ?.name ?? {},
                  locale,
                )}{' '}
                ·{' '}
                {approval.current
                  ? uiText(locale, 'Действует', 'Current')
                  : uiText(locale, 'Не действует', 'No longer valid')}{' '}
                ·{' '}
                <time dateTime={approval.approvedAt}>
                  {new Date(approval.approvedAt).toLocaleString(locale)}
                </time>
              </li>
            ))}
          </ul>
          {query.data.votes.map((vote) => (
            <details key={vote.id}>
              <summary>
                {uiText(locale, 'Голосование по решению', 'Decision vote')} ·{' '}
                {vote.approved
                  ? uiText(locale, 'Одобрено', 'Approved')
                  : uiText(locale, 'Результат ожидается', 'Awaiting result')}
              </summary>
              <VotingCard id={vote.id} admin={false} />
            </details>
          ))}
          {query.data.manualReason !== null && <p>{query.data.manualReason}</p>}
          {query.data.appliedAt !== null && (
            <p>
              {uiText(locale, 'Исполнено', 'Executed')}:{' '}
              <time dateTime={query.data.appliedAt}>
                {new Date(query.data.appliedAt).toLocaleString(locale)}
              </time>
            </p>
          )}
          <details>
            <summary>{uiText(locale, 'Проверка неизменности', 'Integrity evidence')}</summary>
            <p>
              {uiText(locale, 'Хеш условий', 'Terms hash')}: {query.data.payloadHash}
            </p>
            <p>
              {uiText(locale, 'Редакция устава', 'Charter revision')}: {query.data.revisionId}
            </p>
          </details>
        </>
      )}
    </section>
  );
}
export { CompanyDecisionPage };
