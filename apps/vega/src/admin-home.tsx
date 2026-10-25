import { uiText } from './states/text';
import { useTranslation } from './i18n';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { getAdminStats } from '@helicraft/alhena';
import { PageHeader, Alert } from '@helicraft/atria';
import { browserClient } from './account-api';

import styles from './account.module.scss';

const route = getRouteApi('/admin');

async function statsQuery(): Promise<Awaited<ReturnType<typeof getAdminStats>>['data']> {
  const { data } = await getAdminStats({ client: browserClient(), throwOnError: true });
  return data;
}
export function AdminHome(): ReactElement {
  const { text, locale } = useTranslation();

  const { principal } = route.useRouteContext();
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: statsQuery,
    enabled: principal.permissions.includes('content.read'),
  });
  return (
    <>
      <PageHeader
        title={text('admin.workspace')}
        description={uiText(
          locale,
          'Рабочее пространство для публикаций, игроков и государственных решений. Выберите раздел; доступные действия зависят от ваших полномочий.',
          'Manage publications, players and state decisions. Choose a section; available actions follow your permissions.',
        )}
      />
      {stats.data ? (
        <dl className={styles.metrics}>
          {stats.data.users === null ? null : (
            <>
              <div>
                <dt>{text('admin.stats.users')}</dt>
                <dd>{stats.data.users}</dd>
              </div>
              <div>
                <dt>{text('admin.stats.activeAccounts')}</dt>
                <dd>{stats.data.activeUsers}</dd>
              </div>
            </>
          )}
          <div>
            <dt>{text('admin.stats.publishedPages')}</dt>
            <dd>{stats.data.publishedPages}</dd>
          </div>
          <div>
            <dt>{text('admin.stats.pageDrafts')}</dt>
            <dd>{stats.data.draftPages}</dd>
          </div>
          <div>
            <dt>{text('admin.stats.stories')}</dt>
            <dd>{stats.data.publishedChronicle}</dd>
          </div>
        </dl>
      ) : null}
      {stats.isError ? <Alert tone="danger">{text('admin.stats.unavailable')}</Alert> : null}
      <div className={styles.actionGrid}>
        {principal.permissions.includes('content.read') && (
          <Link className={styles.actionCard} to="/admin/pages">
            <h2>{text('admin.pages')}</h2>
            <p>
              {uiText(
                locale,
                'Редактирование, переводы и публикация страниц.',
                'Edit, translate and publish pages.',
              )}
            </p>
          </Link>
        )}
        {principal.permissions.includes('content.read') && (
          <Link className={styles.actionCard} to="/admin/chronicle">
            <h2>{text('admin.chronicle')}</h2>
            <p>
              {uiText(
                locale,
                'Публикации хроники и история редакций.',
                'Chronicle publications and revision history.',
              )}
            </p>
          </Link>
        )}
        {principal.permissions.includes('users.read') && (
          <Link className={styles.actionCard} to="/admin/users">
            <h2>{text('admin.users')}</h2>
            <p>
              {uiText(
                locale,
                'Поиск игроков, статусы и полномочия.',
                'Player search, account status and permissions.',
              )}
            </p>
          </Link>
        )}
        {principal.permissions.includes('states.manage') && (
          <Link className={styles.actionCard} to="/admin/states">
            <h2>{text('states.title')}</h2>
            <p>
              {uiText(
                locale,
                'Проверка государств и государственных изменений.',
                'Review states and governance changes.',
              )}
            </p>
          </Link>
        )}
        {principal.permissions.includes('voting.manage') && (
          <Link className={styles.actionCard} to="/admin/votings">
            <h2>{text('votings.title')}</h2>
            <p>
              {uiText(
                locale,
                'Опросы с одним или несколькими вопросами.',
                'Polls with one or more questions.',
              )}
            </p>
          </Link>
        )}
        {principal.permissions.includes('audit.read') && (
          <Link className={styles.actionCard} to="/admin/audit">
            <h2>{text('admin.audit')}</h2>
            <p>
              {uiText(
                locale,
                'Проверка действий и истории изменений.',
                'Review actions and change history.',
              )}
            </p>
          </Link>
        )}
      </div>
    </>
  );
}
