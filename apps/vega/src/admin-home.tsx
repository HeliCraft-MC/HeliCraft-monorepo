import { getRouteApi, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { getAdminStats } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient } from './account-api';

import styles from './account.module.scss';

const route = getRouteApi('/admin');

async function statsQuery(): Promise<Awaited<ReturnType<typeof getAdminStats>>['data']> {
  const { data } = await getAdminStats({ client: browserClient(), throwOnError: true });
  return data;
}
export function AdminHome(): ReactElement {
  const { principal } = route.useRouteContext();
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: statsQuery,
    enabled: principal.permissions.includes('content.read'),
  });
  return (
    <>
      <h1>Рабочее пространство</h1>
      {stats.data ? (
        <dl className={styles.section}>
          {stats.data.users === null ? null : (
            <>
              <dt>Пользователей</dt>
              <dd>{stats.data.users}</dd>
              <dt>Активных аккаунтов</dt>
              <dd>{stats.data.activeUsers}</dd>
            </>
          )}
          <dt>Опубликованных страниц</dt>
          <dd>{stats.data.publishedPages}</dd>
          <dt>Черновиков страниц</dt>
          <dd>{stats.data.draftPages}</dd>
          <dt>Историй</dt>
          <dd>{stats.data.publishedChronicle}</dd>
        </dl>
      ) : null}
      {stats.isError ? <Alert tone="danger">Не удалось загрузить показатели</Alert> : null}
      <div className={styles.navigation}>
        {principal.permissions.includes('content.write') ? (
          <>
            <Link to="/admin/pages/new">Создать страницу</Link>
            <Link to="/admin/chronicle/new">Написать публикацию</Link>
          </>
        ) : null}
        {principal.permissions.includes('users.read') ? (
          <Link to="/admin/users">Открыть пользователей</Link>
        ) : null}
      </div>
    </>
  );
}
