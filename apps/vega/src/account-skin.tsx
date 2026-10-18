import { lazy, Suspense, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSkin } from '@helicraft/alhena';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import styles from './account.module.scss';

const Viewer = lazy(async () => {
  const module = await import('./skin-viewer');
  return { default: module.SkinPreview };
});
function AccountSkin({
  id,
  skinId,
}: Readonly<{ id: string; skinId: string | null }>): ReactElement {
  const { text } = useTranslation();
  const skin = useQuery({
    queryKey: ['skin', id],
    queryFn: async () => {
      const result = await getSkin({ client: browserClient(), throwOnError: true });
      return result.data;
    },
  });
  const fallback = useMemo(() => <p>{text('skin.loadingPreview')}</p>, [text]);
  return (
    <section className={styles.skinPreview}>
      <h2>{text('account.skin')}</h2>
      <Suspense fallback={fallback}>
        <Viewer
          url={
            skin.data?.skinUrl ?? `/api/v1/public/players/${id}/skin.png?v=${skinId ?? 'default'}`
          }
          model={skin.data?.model ?? 'CLASSIC'}
        />
      </Suspense>
      <a href="/app/settings/skin">{text('skin.title')}</a>
    </section>
  );
}
export { AccountSkin };
