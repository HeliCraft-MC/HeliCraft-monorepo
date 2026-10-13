import { PlayerNickname } from './player-nickname';
import { localizeContent } from './localized-content';
import { useTranslation } from './i18n';
import { useLoaderData } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { MarkdownContent, PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

export function PublicContent(): ReactElement {
  const { locale } = useTranslation();
  const data = useLoaderData({ strict: false });
  const original = data && 'content' in data ? data.content?.document : null;
  const content = original ? localizeContent(original, locale) : null;
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <h1>{content?.title}</h1>
        <p className={styles.paragraph}>{content?.description}</p>
        {content?.kind === 'CHRONICLE' && (
          <p>
            <PlayerNickname id={content.authorId} name={content.author} />
          </p>
        )}
        {content ? <MarkdownContent html={content.html} /> : null}
      </PageContainer>
    </main>
  );
}
