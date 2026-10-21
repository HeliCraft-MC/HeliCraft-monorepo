// oxlint-disable import/max-dependencies -- A share proposal page presents immutable terms, real recipient consent, issuer approval evidence and separately authorized execution.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getShareOperation } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { ShareOperationSummary } from './share-operation-summary';
import { CompanyOwnerIdentity } from './owner-identity';
import { PersonalShareConsent } from './personal-share-consent';
import { PersonalShareExecution } from './personal-share-execution';
import { operationRecipients } from './share-view-model';
import { companyStatusLabel } from './labels';
import styles from './companies.module.scss';

function ShareOperationPage({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['share-operation', id, actorId],
    queryFn: async () => {
      const result = await getShareOperation({
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
      <h1>{uiText(locale, 'Операция с акциями', 'Share operation')}</h1>
      <Button onClick={refresh} disabled={query.isFetching}>
        {uiText(locale, 'Обновить согласия и исполнение', 'Refresh consent and outcome')}
      </Button>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && query.error === null && (
        <>
          <ShareOperationSummary operation={query.data.operation} />
          {query.data.eventId === null ? (
            <p>
              {uiText(
                locale,
                'Пока это предложение: собственность ещё не изменена.',
                'This is a proposal; ownership has not changed yet.',
              )}
            </p>
          ) : (
            <Alert tone="success">
              {uiText(
                locale,
                'Операция с акциями исполнена. Собственность и журнал обновлены атомарно.',
                'Share operation completed. Ownership and its journal changed atomically.',
              )}
            </Alert>
          )}
          {!query.data.termsCurrent && query.data.eventId === null && (
            <Alert>
              {uiText(
                locale,
                'Условия сейчас недоступны. Проверьте статус эмитента, его устав и доступное количество акций.',
                'These terms are currently unavailable. Review issuer status, charter and available shares.',
              )}
            </Alert>
          )}
          <PersonalShareConsent view={query.data} actorId={actorId} onSaved={refresh} />
          <h2>{uiText(locale, 'Согласия получателей', 'Recipient consents')}</h2>
          <ul>
            {query.data.consents.map((consent) => (
              <li key={consent.id}>
                <CompanyOwnerIdentity owner={consent.owner} /> ·{' '}
                {companyStatusLabel(consent.status, locale)}
              </li>
            ))}
          </ul>
          {operationRecipients(query.data.operation)
            .filter((owner) => owner.type !== 'PLAYER')
            .map((owner) => (
              <p key={`${owner.type}:${owner.id}`}>
                <CompanyOwnerIdentity owner={owner} /> ·{' '}
                <a
                  href={
                    owner.type === 'COMPANY'
                      ? `/app/companies/${owner.id}?section=ownership&shareOperationId=${id}`
                      : `/app/states/${owner.id}/manage?section=companies&shareOperationId=${id}`
                  }
                >
                  {uiText(
                    locale,
                    'Рассмотрение получателем через его Governance',
                    'Recipient review through its Governance',
                  )}
                </a>
              </p>
            ))}
          {query.data.operation.kind === 'TRANSFER' && (
            <PersonalShareExecution
              operation={query.data.operation}
              view={query.data}
              actorId={actorId}
              onSaved={refresh}
            />
          )}
          <p>
            <a
              href={`/app/companies/${query.data.operation.issuerId}?section=ownership&shareOperationId=${id}`}
            >
              {uiText(
                locale,
                'Рассмотрение выпуска или одобрения эмитентом',
                'Issuer review of issuance or transfer approval',
              )}
            </a>
          </p>
          {query.data.operation.kind === 'TRANSFER' &&
            query.data.operation.owner.type !== 'PLAYER' && (
              <p>
                <a
                  href={
                    query.data.operation.owner.type === 'COMPANY'
                      ? `/app/companies/${query.data.operation.owner.id}?section=ownership&shareOperationId=${id}`
                      : `/app/states/${query.data.operation.owner.id}/manage?section=companies&shareOperationId=${id}`
                  }
                >
                  {uiText(
                    locale,
                    'Исполнение через Governance собственника',
                    'Execution through owner Governance',
                  )}
                </a>
              </p>
            )}
          <details>
            <summary>{uiText(locale, 'Доказательства неизменности', 'Integrity evidence')}</summary>
            <p>{query.data.termsHash}</p>
            {query.data.eventId !== null && <p>{query.data.eventId}</p>}
          </details>
        </>
      )}
    </section>
  );
}
export { ShareOperationPage };
