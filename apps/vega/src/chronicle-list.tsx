import { formatDate } from './date-format';
import { useCallback } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer, Alert, Pagination } from '@helicraft/atria';

import styles from './account.module.scss';

const route = getRouteApi('/chronicle/');

export function ChronicleList(): ReactElement {
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
        <p className={styles.eyebrow}>HeliCraft / Летопись</p>
        <h1>Проходят дни. Истории остаются.</h1>
        {chronicle === null ? <Alert>Летопись временно недоступна</Alert> : null}
        {chronicle !== null && chronicle.items.length === 0 ? (
          <section className={styles.section}>
            <h2>Первая глава ещё пишется.</h2>
            <p>Здесь появятся опубликованные истории мира и новости разработки.</p>
          </section>
        ) : null}
        {chronicle !== null && chronicle.items.length > 0
          ? chronicle.items.map((entry) => (
              <article className={styles.section} key={entry.id}>
                <p className={styles.eyebrow}>
                  {entry.category} / {formatDate(entry.publishedAt)}
                </p>
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
