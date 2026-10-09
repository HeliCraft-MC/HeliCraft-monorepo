import { formatDate } from './date-format';
import { useLoaderData } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { MarkdownContent, PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

export function PublicContent(): ReactElement {
  const data = useLoaderData({ strict: false });
  const content = data && 'content' in data ? data.content?.document : null;
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <p className={styles.eyebrow}>
          {content?.category} / {formatDate(content?.publishedAt)}
        </p>
        <h1>{content?.title}</h1>
        <p className={styles.paragraph}>{content?.description}</p>
        {content ? <MarkdownContent html={content.html} /> : null}
      </PageContainer>
    </main>
  );
}
