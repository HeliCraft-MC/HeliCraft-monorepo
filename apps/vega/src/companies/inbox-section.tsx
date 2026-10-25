import { useCallback, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listCompanyInbox } from '@helicraft/alhena';
import type { ListCompanyInboxData } from '@helicraft/alhena';
import { Alert, Button, FormSection, Icon } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { companyActionLabel } from './labels';
import { economicLabels } from '../taxation/model';
import styles from './companies.module.scss';

type InboxKind = ListCompanyInboxData['query']['kind'];
const LAST_PAGE = -1;
const initialCursor: string | undefined = undefined;
const ACTIONS: Readonly<Record<string, readonly [string, string]>> = {
  FOUNDER_CONSENT: ['Согласие учредителя', 'Founder consent'],
  OFFICE_CONSENT: ['Согласие на должность', 'Office consent'],
  REGISTRATION_REVIEW: ['Рассмотреть регистрацию', 'Review registration'],
  SHARE_CONSENT: ['Принять акции', 'Accept shares'],
};
function CompanyInboxSection({
  kind,
  actorId,
  title,
}: Readonly<{ kind: InboxKind; actorId: string; title: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useInfiniteQuery({
    queryKey: ['company-inbox', actorId, kind],
    initialPageParam: initialCursor,
    queryFn: async ({ pageParam }) => {
      const result = await listCompanyInbox({
        client: browserClient(),
        query: { kind, after: pageParam },
        throwOnError: true,
      });
      return result.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextId ?? undefined,
  });
  const { fetchNextPage } = query;
  const more = useCallback((): void => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const pages = query.data?.pages;
  const morePending = query.hasNextPage;
  const fetching = query.isFetching;
  const failed = query.isError;
  useEffect(() => {
    const latest = pages?.at(LAST_PAGE);
    if (morePending && !fetching && !failed && latest?.items.length === 0) {
      void fetchNextPage();
    }
  }, [pages, morePending, fetching, failed, fetchNextPage]);
  const items = pages?.flatMap((page) => page.items) ?? [];
  return (
    <FormSection title={title}>
      {(query.isPending || (items.length === 0 && query.hasNextPage)) && (
        <p>{uiText(locale, 'Загрузка согласований…', 'Loading requests…')}</p>
      )}
      {items.length === 0 && query.isSuccess && !query.hasNextPage && (
        <p>{uiText(locale, 'Нет ожидающих действий.', 'No pending actions.')}</p>
      )}
      <ul className={styles.inboxList}>
        {items.map((item) => {
          const names = ACTIONS[item.action];
          const stateLabel = economicLabels[item.action];
          const fallback =
            kind === 'STATE_DECISION' && stateLabel !== undefined
              ? uiText(locale, stateLabel[0], stateLabel[1])
              : companyActionLabel(item.action, locale);
          const action = names === undefined ? fallback : uiText(locale, names[0], names[1]);
          return (
            <li key={item.id}>
              <a href={item.href}>
                <strong>{displayText(item.title, locale) || action}</strong>
                <span>
                  {action} <Icon name="arrowRight" />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage && (
        <Button tone="quiet" onClick={more} disabled={query.isFetchingNextPage}>
          {uiText(locale, 'Проверить следующие', 'Check more requests')}
        </Button>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </FormSection>
  );
}
export { CompanyInboxSection };
