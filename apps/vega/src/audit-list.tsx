import { uiText } from './states/text';
import { useTranslation } from './i18n';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudit } from '@helicraft/alhena';
import { Alert, FormField, Pagination, Table, TextField } from '@helicraft/atria';
import { browserClient } from './account-api';
import styles from './account.module.scss';

const PAGE_SIZE = 20;
const JSON_INDENT = 2;
const auditRoute = getRouteApi('/admin/audit');
export function AuditList(): ReactElement {
  const { text, locale } = useTranslation();

  const search = auditRoute.useSearch();
  const [target, setTarget] = useState(search.target ?? '');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const handleAction = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setAction(event.target.value);
    setPage(1);
  }, []);
  const handleTarget = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTarget(event.target.value);
    setPage(1);
  }, []);
  const handleActor = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setActor(event.target.value);
    setPage(1);
  }, []);
  const handleFrom = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setFrom(event.target.value);
    setPage(1);
  }, []);
  const handleTo = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTo(event.target.value);
    setPage(1);
  }, []);
  const result = useQuery({
    queryKey: ['audit', page, action, actor, target, from, to],
    queryFn: async () => {
      const { data } = await getAudit({
        client: browserClient(),
        query: {
          page,
          pageSize: PAGE_SIZE,
          action: action || undefined,
          actor: actor || undefined,
          target: target || undefined,
          from: from === '' ? undefined : new Date(from).toISOString(),
          to: to === '' ? undefined : new Date(to).toISOString(),
        },
        throwOnError: true,
      });
      return data;
    },
  });
  return (
    <>
      <h1>{text('admin.audit')}</h1>
      <p className={styles.paragraph}>
        {uiText(
          locale,
          'История административных действий. Уточните автора, объект или период; дополнительные сведения можно открыть в каждой записи.',
          'Review administrative actions. Filter by actor, target or time period; expand individual records for details.',
        )}
      </p>
      <div className={styles.filters}>
        <FormField label={text('audit.action')} htmlFor="audit-action">
          <TextField id="audit-action" value={action} onChange={handleAction} />
        </FormField>
        <FormField label={text('audit.objectUuid')} htmlFor="audit-target">
          <TextField id="audit-target" value={target} onChange={handleTarget} />
        </FormField>
        <FormField label={text('audit.authorUuid')} htmlFor="audit-actor">
          <TextField id="audit-actor" value={actor} onChange={handleActor} />
        </FormField>
        <FormField label={text('audit.startDate')} htmlFor="audit-from">
          <TextField id="audit-from" type="datetime-local" value={from} onChange={handleFrom} />
        </FormField>
        <FormField label={text('audit.endDate')} htmlFor="audit-to">
          <TextField id="audit-to" type="datetime-local" value={to} onChange={handleTo} />
        </FormField>
      </div>
      {result.isError ? <Alert tone="danger">{text('audit.unavailable')}</Alert> : null}
      <Table>
        <caption>{text('audit.title')}</caption>
        <thead>
          <tr>
            <th>{text('audit.time')}</th>
            <th>{text('common.author')}</th>
            <th>{text('audit.action')}</th>
            <th>{text('audit.object')}</th>
            <th>{text('audit.metadata')}</th>
          </tr>
        </thead>
        <tbody>
          {result.data?.items.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.occurredAt}</td>
              <td>{entry.actorId}</td>
              <td>{entry.action}</td>
              <td>
                {entry.targetType} / {entry.targetId}
              </td>
              <td aria-label={text('audit.metadata')}>
                <details>
                  <summary>{text('audit.metadata')}</summary>
                  <pre className={styles.auditMetadata}>
                    {JSON.stringify(entry.metadata, null, JSON_INDENT)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {result.data?.items.length === 0 ? <p>{text('audit.empty')}</p> : null}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
