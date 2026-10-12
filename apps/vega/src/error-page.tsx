import type { ReactElement } from 'react';
import { useTranslation } from './i18n';
import { PageContainer } from '@helicraft/atria';

function ErrorPage(): ReactElement {
  const { text } = useTranslation();
  return (
    <main id="main-content">
      <PageContainer narrow>
        <h1>{text('errors.pageLoadFailed')}</h1>
        <p>{text('errors.pageLoadHint')}</p>
        <a href="/">{text('common.home')}</a>
      </PageContainer>
    </main>
  );
}
export { ErrorPage };
