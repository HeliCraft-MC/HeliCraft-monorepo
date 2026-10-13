// oxlint-disable import/max-dependencies -- The public route composes typed loaders, directory controls and shared cards.
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer, ActionLink } from '@helicraft/atria';
import { loadStates } from '../states/public-data';
import { uiText } from '../states/text';
import { useTranslation } from '../i18n';
import { PublicStateCard } from '../states/public-card';
import { DirectoryFilters } from '../states/directory-filters';
import { directorySearch, directoryUrl } from '../states/directory-search';
import { metadata } from '../metadata';
import styles from '../states/states.module.scss';

const routeApi = getRouteApi('/states/');
function Page(): ReactElement {
  const { directory } = routeApi.useLoaderData();
  const search = routeApi.useSearch();
  const { locale } = useTranslation();
  const pages = Math.ceil((directory?.total ?? 0) / (directory?.pageSize ?? 1));
  return (
    <main id="main-content">
      <PageContainer>
        <section className={styles.page}>
          <div className={styles.heading}>
            <div>
              <h1>{uiText(locale, 'Государства', 'States')}</h1>
              <p className={styles.hint}>
                {uiText(
                  locale,
                  'Государства игроков, одобренные администрацией. Найдите своё сообщество и узнайте его правила.',
                  'Player states approved by the administration. Find your community and explore its rules.',
                )}
              </p>
            </div>
            <ActionLink href="/app/states/new">
              {uiText(locale, 'Создать государство', 'Create a state')}
            </ActionLink>
          </div>
          <DirectoryFilters search={search} />
          {directory === null ? (
            <output>
              {uiText(
                locale,
                'Государства временно недоступны. Попробуйте позже.',
                'States are temporarily unavailable. Please try again later.',
              )}
            </output>
          ) : (
            <>
              <output>
                {uiText(locale, 'Найдено государств:', 'States found:')} {directory.total}
              </output>
              <div className={styles.directoryGrid}>
                {directory.items.map((state) => (
                  <PublicStateCard key={state.id} state={state} />
                ))}
              </div>
              {directory.total === 0 && (
                <div className={styles.card}>
                  <h2>{uiText(locale, 'Государства не найдены', 'No states found')}</h2>
                  <p>
                    {uiText(
                      locale,
                      'Измените запрос или сбросьте фильтры. Здесь появятся государства после одобрения администрацией.',
                      'Try another search or reset the filters. States appear here after administration approval.',
                    )}
                  </p>
                </div>
              )}
              {pages > 1 && (
                <nav
                  className={styles.pagination}
                  aria-label={uiText(locale, 'Страницы государств', 'State pages')}
                >
                  {directory.page > 1 && (
                    <a href={directoryUrl(search, locale, directory.page - 1)}>
                      {uiText(locale, 'Назад', 'Previous')}
                    </a>
                  )}
                  <span>
                    {uiText(locale, 'Страница', 'Page')} {directory.page} / {pages}
                  </span>
                  {directory.page < pages && (
                    <a href={directoryUrl(search, locale, directory.page + 1)}>
                      {uiText(locale, 'Далее', 'Next')}
                    </a>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/states/')({
  validateSearch: directorySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, context }) =>
    await loadStates({ data: { ...deps, locale: context.locale } }),
  head: ({ match, loaderData }) =>
    metadata({
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Государства', 'States'),
      description: uiText(
        match.context.locale,
        'Каталог государств HeliCraft: граждане, флаги и правила вступления.',
        'HeliCraft state directory: citizens, flags and entry rules.',
      ),
      path: '/states',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      noindex:
        match.search.search !== '' ||
        match.search.page > 1 ||
        match.search.entryMode !== 'ALL' ||
        match.search.constitution !== 'ALL',
    }),
  component: Page,
});
export { Route };
