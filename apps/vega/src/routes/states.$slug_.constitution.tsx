import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ReactElement, CSSProperties } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadPublicState } from '../states/public-data';
import { ConstitutionDocument } from '../states/constitution';
import { displayText, uiText } from '../states/text';
import { useTranslation } from '../i18n';
import { metadata } from '../metadata';
import { HTTP } from '../http-status';
import styles from '../states/public-detail.module.scss';

const route = getRouteApi('/states/$slug_/constitution');
function Page(): ReactElement {
  const { locale } = useTranslation();
  const { state } = route.useLoaderData();
  const color = state?.configuration.color;
  const accent = useMemo<CSSProperties & { '--state-accent': string }>(
    () => ({ '--state-accent': color ?? 'var(--accent)' }),
    [color],
  );
  return (
    <main id="main-content">
      <PageContainer>
        {state && (
          <article className={styles.page} style={accent}>
            <a href={`/states/${state.slug}`} className={styles.back}>
              ← {displayText(state.configuration.name, locale)}
            </a>
            <h1>{uiText(locale, 'Конституция', 'Constitution')}</h1>
            <div className={styles.paper}>
              <ConstitutionDocument
                configuration={state.configuration}
                founders={state.founders}
                html={state.constitutionHtml}
                showGovernanceWhenAbsent={false}
              />
            </div>
          </article>
        )}
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/states/$slug_/constitution')({
  loader: async ({ params, context }) => {
    const data = await loadPublicState({ data: { slug: params.slug, locale: context.locale } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.state) {
      throw new Error('State unavailable');
    }
    return data;
  },
  head: ({ loaderData, match }) =>
    metadata({
      locale: match.context.locale,
      title: `${uiText(match.context.locale, 'Конституция', 'Constitution')} · ${displayText(loaderData?.state?.configuration.name ?? {}, match.context.locale)}`,
      description: '',
      path: `/states/${match.params.slug}/constitution`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
