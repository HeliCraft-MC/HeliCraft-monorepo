import { localizeContent } from './localized-content';
import { useTranslation } from './i18n';
import { useLoaderData, useLocation } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { MarkdownContent, PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

const information: Record<string, { title: string; paragraphs: readonly string[] }> = {
  '/world': {
    title: 'world.title',
    paragraphs: [
      'world.introduction',
      'world.statesDescription',
      'world.companiesDescription',
      'world.chronicleDescription',
    ],
  },
  '/start': {
    title: 'start.title',
    paragraphs: [
      'start.installMinecraft',
      'start.connectServer',
      'start.readRules',
      'start.createWebsiteAccount',
      'start.passwordSafety',
    ],
  },
  '/rules': {
    title: 'rules.title',
    paragraphs: [
      'rules.respectOthers',
      'rules.accountOwnership',
      'rules.reportBugs',
      'rules.respectProperty',
      'rules.publicationRights',
    ],
  },
};
export function InfoPage(): ReactElement {
  const { text, locale } = useTranslation();
  const data = useLoaderData({ strict: false });
  const location = useLocation();
  if (
    data !== undefined &&
    'content' in data &&
    data.content !== null &&
    data.content !== undefined
  ) {
    const localized = localizeContent(data.content.document, locale);
    return (
      <main id="main-content" className={styles.page}>
        <PageContainer narrow>
          <h1>{localized.title}</h1>
          <MarkdownContent html={localized.html} />
        </PageContainer>
      </main>
    );
  }
  const content = information[location.pathname];
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <h1>{text(content?.title ?? 'HeliCraft')}</h1>
        {content?.paragraphs.map((paragraph) => (
          <p className={styles.paragraph} key={text(paragraph)}>
            {text(paragraph)}
          </p>
        ))}
      </PageContainer>
    </main>
  );
}
