import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import styles from './companies.module.scss';

function PublicCompanyCard({
  company,
}: Readonly<{ company: PublishedCompanyIdentity }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <article className={styles.card}>
      <h2>
        <a href={`/companies/${company.id}`}>{displayText(company.name, locale)}</a>
      </h2>
      <p>{displayText(company.description, locale)}</p>
      <dl className={styles.facts}>
        <div>
          <dt>{uiText(locale, 'Государство регистрации', 'Registration jurisdiction')}</dt>
          <dd>{displayText(company.registrationStateName, locale)}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Статус', 'Status')}</dt>
          <dd>{label(company.status, locale)}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Дата учреждения', 'Founded')}</dt>
          <dd>
            <time dateTime={company.foundedAt}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                new Date(company.foundedAt),
              )}
            </time>
          </dd>
        </div>
      </dl>
    </article>
  );
}
export { PublicCompanyCard };
