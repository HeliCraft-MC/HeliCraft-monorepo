import type { ReactElement } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useIsFetching } from '@tanstack/react-query';
import { useTranslation } from './i18n';
import { useHydrated } from './use-hydrated';
import styles from './route-loading.module.scss';

function NavigationProgress(): ReactElement | null {
  const { locale } = useTranslation();
  const navigating = useRouterState({ select: (state) => state.isLoading });
  const fetching = useIsFetching();
  const hydrated = useHydrated();
  return hydrated && (navigating || fetching > 0) ? (
    <output className={styles.progress} aria-label={locale === 'ru' ? 'Загрузка…' : 'Loading…'}>
      <span />
    </output>
  ) : null;
}
export { NavigationProgress };
