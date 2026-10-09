import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudit } from '@helicraft/alhena';
import { Alert, FormField, Pagination, Table, TextField } from '@helicraft/atria';
import { browserClient } from './account-api';
import styles from './account.module.scss';

const PAGE_SIZE = 20;
const auditRoute = getRouteApi('/admin/audit');
export function AuditList(): ReactElement {
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
      <h1>Аудит</h1>
      <div className={styles.form}>
        <FormField label="Действие" htmlFor="audit-action">
          <TextField id="audit-action" value={action} onChange={handleAction} />
        </FormField>
        <FormField label="UUID объекта" htmlFor="audit-target">
          <TextField id="audit-target" value={target} onChange={handleTarget} />
        </FormField>
        <FormField label="UUID автора" htmlFor="audit-actor">
          <TextField id="audit-actor" value={actor} onChange={handleActor} />
        </FormField>
        <FormField label="Начиная с" htmlFor="audit-from">
          <TextField id="audit-from" type="datetime-local" value={from} onChange={handleFrom} />
        </FormField>
        <FormField label="До" htmlFor="audit-to">
          <TextField id="audit-to" type="datetime-local" value={to} onChange={handleTo} />
        </FormField>
      </div>
      {result.isError ? <Alert tone="danger">Аудит недоступен или фильтр некорректен</Alert> : null}
      <Table>
        <caption>Административные действия</caption>
        <thead>
          <tr>
            <th>Время</th>
            <th>Автор</th>
            <th>Действие</th>
            <th>Объект</th>
            <th>Метаданные</th>
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
              <td>{JSON.stringify(entry.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {result.data?.items.length === 0 ? <p>Действий пока нет.</p> : null}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
