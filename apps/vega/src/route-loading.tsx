import type { ReactElement } from 'react';
import { LoadingState } from '@helicraft/atria';
import { useTranslation } from './i18n';

function RouteLoading(): ReactElement {
  const { locale } = useTranslation();
  return <LoadingState label={locale === 'ru' ? 'Загрузка страницы…' : 'Loading page…'} />;
}
export { RouteLoading };
