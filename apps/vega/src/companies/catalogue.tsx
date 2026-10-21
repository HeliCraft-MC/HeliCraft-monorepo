import type { ReactElement } from 'react';
import type { CompanyCatalogue } from '@helicraft/alhena';
import { PageContainer } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PublicCompanyCard } from './public-card';
import { CatalogueFilters } from './catalogue-filters';
import { catalogueUrl } from './catalogue-search';
import type { CatalogueSearch } from './catalogue-search';
import styles from './companies.module.scss';

const EMPTY_JURISDICTIONS: CompanyCatalogue['jurisdictions'] = [];
function CompanyCataloguePage({
  catalogue,
  search,
}: Readonly<{ catalogue: CompanyCatalogue | null; search: CatalogueSearch }>): ReactElement {
  const { locale } = useTranslation();
  const pages = Math.ceil((catalogue?.total ?? 0) / (catalogue?.pageSize ?? 1));
  return (
    <main id="main-content">
      <PageContainer>
        <section className={styles.page}>
          <header>
            <h1>{uiText(locale, 'Компании', 'Companies')}</h1>
            <p>
              {uiText(
                locale,
                'Учреждённые компании и их государства регистрации.',
                'Registered companies and their legal jurisdictions.',
              )}
            </p>
          </header>
          <CatalogueFilters
            search={search}
            jurisdictions={catalogue?.jurisdictions ?? EMPTY_JURISDICTIONS}
          />
          {catalogue === null ? (
            <output>
              {uiText(
                locale,
                'Каталог компаний временно недоступен. Попробуйте позже.',
                'The company catalogue is temporarily unavailable. Please try again later.',
              )}
            </output>
          ) : (
            <>
              <output>
                {uiText(locale, 'Найдено компаний:', 'Companies found:')} {catalogue.total}
              </output>
              <div className={styles.grid}>
                {catalogue.items.map((company) => (
                  <PublicCompanyCard key={company.id} company={company} />
                ))}
              </div>
              {catalogue.total === 0 && (
                <section className={styles.card}>
                  <h2>{uiText(locale, 'Компании не найдены', 'No companies found')}</h2>
                  <p>
                    {uiText(
                      locale,
                      'Измените запрос или сбросьте фильтры.',
                      'Try another search or reset the filters.',
                    )}
                  </p>
                </section>
              )}
              {pages > 1 && (
                <nav
                  className={styles.actions}
                  aria-label={uiText(locale, 'Страницы компаний', 'Company pages')}
                >
                  {catalogue.page > 1 && (
                    <a href={catalogueUrl(search, locale, catalogue.page - 1)}>
                      {uiText(locale, 'Назад', 'Previous')}
                    </a>
                  )}
                  <span>
                    {uiText(locale, 'Страница', 'Page')} {catalogue.page} / {pages}
                  </span>
                  {catalogue.page < pages && (
                    <a href={catalogueUrl(search, locale, catalogue.page + 1)}>
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
export { CompanyCataloguePage };
