import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { CompanyCard } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { economyShowcase } from './economy-showcase';
import home from './home.module.scss';
import styles from './economy.module.scss';

function HomeEconomy(): ReactElement {
  const { text } = useTranslation();
  const companies = useMemo(
    () =>
      economyShowcase.companies.map((company) => ({
        ...company,
        logo: <company.icon size={28} strokeWidth={1.5} />,
        facts: [
          { label: text('home.economy.state'), value: text(company.state) },
          { label: text('home.economy.team'), value: text(company.team) },
        ],
      })),
    [text],
  );
  return (
    <section className={home.chapter} id="economy" aria-labelledby="economy-title">
      <div className={home.sectionHead}>
        <div>
          <h2 id="economy-title">{text('home.economy.title')}</h2>
          <p className={home.note}>{text('home.economy.description')}</p>
        </div>
        <span className={styles.demo}>{text('home.economy.demo')}</span>
      </div>
      <div className={home.states}>
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            name={text(company.name)}
            sector={text(company.sector)}
            description={text(company.description)}
            image={company.image}
            logo={company.logo}
            facts={company.facts}
          />
        ))}
      </div>
      <div className={styles.currencies}>
        <table>
          <caption>{text('home.economy.currencies')}</caption>
          <thead>
            <tr>
              <th scope="col">{text('home.economy.currency')}</th>
              <th scope="col">{text('home.economy.issuer')}</th>
              <th scope="col">{text('home.economy.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {economyShowcase.currencies.map((currency) => (
              <tr key={currency.code}>
                <th scope="row">
                  {text(currency.name)} <span className={styles.code}>{currency.code}</span>
                </th>
                <td>{text(currency.issuer)}</td>
                <td className={styles.rate}>
                  {currency.rate} <span>{currency.code}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{text('home.economy.demoDescription')}</p>
    </section>
  );
}
export { HomeEconomy };
