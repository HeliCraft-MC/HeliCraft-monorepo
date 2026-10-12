import { useTranslation } from './i18n';
import type { ReactElement } from 'react';

export function MissingPage(): ReactElement {
  const { text } = useTranslation();

  return (
    <main>
      <h1>{text('errors.pageNotFound')}</h1>
      <p>{text('errors.pageNotFoundHint')}</p>
      <a href="/">{text('common.backHome')}</a>
    </main>
  );
}
