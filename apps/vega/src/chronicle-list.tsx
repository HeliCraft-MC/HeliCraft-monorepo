import { localizeContent } from './localized-content';
import { useTranslation } from './i18n';
import { useCallback } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer, Alert, Pagination } from '@helicraft/atria';

import styles from './account.module.scss';

const route = getRouteApi('/chronicle/');

export function ChronicleList(): ReactElement {
  const { text, locale } = useTranslation();

  const { chronicle, page, pageSize } = route.useLoaderData();
  const navigate = useNavigate();
  const changePage = useCallback(
    (next: number): void => {
      void navigate({ to: '/chronicle', search: { page: next } });
    },
    [navigate],
  );
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer>
        <h1>{text('chronicle.title')}</h1>
        {chronicle === null ? <Alert>{text('chronicle.unavailable')}</Alert> : null}
        {chronicle !== null && chronicle.items.length === 0 ? (
          <section className={styles.section}>
            <h2>{text('chronicle.empty')}</h2>
            <p>{text('chronicle.description')}</p>
          </section>
        ) : null}
        {chronicle !== null && chronicle.items.length > 0
          ? chronicle.items
              .map((record) => localizeContent(record, locale))
              .map((entry) => (
                <article className={styles.section} key={entry.id}>
                  <h2>
                    <a href={`/chronicle/${entry.slug}`}>{entry.title}</a>
                  </h2>
                  <p>{entry.description}</p>
                </article>
              ))
          : null}
        {chronicle === null ? null : (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={chronicle.total}
            onPageChange={changePage}
          />
        )}
      </PageContainer>
    </main>
  );
}
