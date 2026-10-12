import { useTranslation } from './i18n';
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
  const { text } = useTranslation();

  const { principal } = route.useRouteContext();
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: statsQuery,
    enabled: principal.permissions.includes('content.read'),
  });
  return (
    <>
      <h1>{text('admin.workspace')}</h1>
      {stats.data ? (
        <dl className={styles.section}>
          {stats.data.users === null ? null : (
            <>
              <dt>{text('admin.stats.users')}</dt>
              <dd>{stats.data.users}</dd>
              <dt>{text('admin.stats.activeAccounts')}</dt>
              <dd>{stats.data.activeUsers}</dd>
            </>
          )}
          <dt>{text('admin.stats.publishedPages')}</dt>
          <dd>{stats.data.publishedPages}</dd>
          <dt>{text('admin.stats.pageDrafts')}</dt>
          <dd>{stats.data.draftPages}</dd>
          <dt>{text('admin.stats.stories')}</dt>
          <dd>{stats.data.publishedChronicle}</dd>
        </dl>
      ) : null}
      {stats.isError ? <Alert tone="danger">{text('admin.stats.unavailable')}</Alert> : null}
      <div className={styles.navigation}>
        {principal.permissions.includes('content.write') ? (
          <>
            <Link to="/admin/pages/new">{text('content.createPage')}</Link>
            <Link to="/admin/chronicle/new">{text('content.createPublication')}</Link>
          </>
        ) : null}
        {principal.permissions.includes('users.read') ? (
          <Link to="/admin/users">{text('admin.viewUsers')}</Link>
        ) : null}
      </div>
    </>
  );
}
