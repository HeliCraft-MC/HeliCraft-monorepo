import { formatDate } from './date-format';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listAdminPages, listAdminChronicleEntries } from '@helicraft/alhena';
import { Alert, Pagination, Table } from '@helicraft/atria';
import { browserClient } from './account-api';
import styles from './account.module.scss';

const PAGE_SIZE = 20;
export function ContentList(): ReactElement {
  const location = useLocation();
  const pages = location.pathname.startsWith('/admin/pages');
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ['admin-content', pages, page],
    queryFn: async () => {
      const { data } = await (pages ? listAdminPages : listAdminChronicleEntries)({
        client: browserClient(),
        query: { page, pageSize: PAGE_SIZE },
        throwOnError: true,
      });
      return data;
    },
  });
  return (
    <>
      <h1>{pages ? 'Страницы' : 'Летопись'}</h1>
      <div className={styles.navigation}>
        {pages ? (
          <Link to="/admin/pages/new">Создать страницу →</Link>
        ) : (
          <Link to="/admin/chronicle/new">Написать публикацию →</Link>
        )}
      </div>
      {result.isError ? <Alert tone="danger">Не удалось загрузить документы</Alert> : null}
      {result.data?.items.length === 0 ? <p>Документов пока нет. Создай первую главу.</p> : null}
      <Table>
        <caption>{pages ? 'Редакционные страницы' : 'Редакционная летопись'}</caption>
        <thead>
          <tr>
            <th>Название</th>
            <th>Статус</th>
            <th>Автор</th>
            <th>Обновлено</th>
          </tr>
        </thead>
        <tbody>
          {result.data?.items.map((entry) => (
            <tr key={entry.id}>
              <td>
                {pages ? (
                  <a href={`/admin/pages/${entry.id}`}>{entry.title}</a>
                ) : (
                  <a href={`/admin/chronicle/${entry.id}`}>{entry.title}</a>
                )}
              </td>
              <td>{entry.status}</td>
              <td>{entry.author}</td>
              <td>{formatDate(entry.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
