// oxlint-disable import/max-dependencies -- Editorial list composition includes shared identity, localized explanation and pagination controls.
import { uiText } from './states/text';
import { PlayerNickname } from './player-nickname';
import { PageHeader, Icon, Alert, Pagination, Table } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { formatDate } from './date-format';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listAdminPages, listAdminChronicleEntries } from '@helicraft/alhena';
import { browserClient } from './account-api';
import styles from './account.module.scss';

const PAGE_SIZE = 20;
export function ContentList(): ReactElement {
  const { text, locale } = useTranslation();

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
      <PageHeader
        title={pages ? text('admin.pages') : text('admin.chronicle')}
        description={uiText(
          locale,
          'Здесь собраны черновики и опубликованные материалы. Откройте материал для редактирования, переводов и проверки перед публикацией.',
          'Drafts and published content appear here. Open an item to edit, translate and review it before publication.',
        )}
      />
      <div className={styles.navigation}>
        {pages ? (
          <Link to="/admin/pages/new">
            {text('content.createPage')} <Icon name="arrowRight" />
          </Link>
        ) : (
          <Link to="/admin/chronicle/new">
            {text('content.createPublication')} <Icon name="arrowRight" />
          </Link>
        )}
      </div>
      {result.isError ? <Alert tone="danger">{text('content.loadError')}</Alert> : null}
      {result.data?.items.length === 0 ? <p>{text('content.empty')}</p> : null}
      <Table>
        <caption>
          {pages ? text('content.editorialPages') : text('content.editorialChronicle')}
        </caption>
        <thead>
          <tr>
            <th>{text('common.title')}</th>
            <th>{text('common.status')}</th>
            <th>{text('common.author')}</th>
            <th>{text('common.updatedAt')}</th>
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
              <td>
                <PlayerNickname id={entry.authorId} name={entry.author} />
              </td>
              <td>{formatDate(entry.updatedAt, locale)}</td>
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
