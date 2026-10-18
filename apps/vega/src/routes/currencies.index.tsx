import { z } from 'zod';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer, MoneyAmount } from '@helicraft/atria';
import { loadCurrencies } from '../monetary/public-data';
import { metadata } from '../metadata';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

const route = getRouteApi('/currencies/');
function Page(): ReactElement {
  const { currencies, nextCode } = route.useLoaderData();
  const { text, locale } = useTranslation();
  return (
    <main id="main-content">
      <PageContainer>
        <section className={`${styles.panel} ${styles.publicPage}`}>
          <h1>{text('monetary.public')}</h1>
          <p>{text('monetary.publicHint')}</p>
          {currencies === null && <output>{text('monetary.unavailable')}</output>}
          {currencies?.length === 0 && <p>{text('monetary.emptyPublic')}</p>}
          <div className={styles.grid}>
            {currencies?.map((item) => (
              <article className={styles.card} key={item.currency.id}>
                <h2>
                  <a href={`/currencies/${item.currency.code}`}>
                    {displayText(item.currency.name, locale)} · {item.currency.code}
                  </a>
                </h2>
                <p>{displayText(item.bank.name, locale)}</p>
                <MoneyAmount
                  minor={item.currency.supplyMinor}
                  code={item.currency.code}
                  locale={locale}
                />
              </article>
            ))}
          </div>
          {nextCode !== null && (
            <a href={`/currencies?after=${encodeURIComponent(nextCode)}&lang=${locale}`}>
              {text('common.next')}
            </a>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/currencies/')({
  validateSearch: z.object({ after: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => await loadCurrencies({ data: deps }),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Национальные валюты', 'National currencies'),
      description: uiText(
        match.context.locale,
        'Центральные банки, денежная масса и политика государств {serverName}.',
        '{serverName} central banks, money supply and state monetary policies.',
      ),
      path: '/currencies',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
