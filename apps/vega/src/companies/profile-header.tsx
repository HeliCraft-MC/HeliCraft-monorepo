import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import { RegistrationStateName } from './registration-state-name';
import styles from './companies.module.scss';

function CompanyProfileHeader({
  identity,
  categories,
}: Readonly<{ identity: PublishedCompanyIdentity; categories: readonly string[] }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <header className={styles.profileHero}>
      {identity.branding?.coverMediaId !== null &&
        identity.branding?.coverMediaId !== undefined && (
          <img
            className={styles.cover}
            src={`/api/v1/public/companies/${identity.id}/media/${identity.branding.coverMediaId}`}
            alt=""
          />
        )}
      <nav className={styles.actions} aria-label={uiText(locale, 'Компания', 'Company')}>
        <a href="/companies">{uiText(locale, 'Все компании', 'All companies')}</a>
        <a href={`/app/companies/${identity.id}`}>
          {uiText(locale, 'Рабочее пространство компании', 'Company workspace')}
        </a>
      </nav>
      <div className={styles.profileIdentity}>
        {identity.branding?.logoMediaId !== null &&
          identity.branding?.logoMediaId !== undefined && (
            <img
              className={styles.logo}
              src={`/api/v1/public/companies/${identity.id}/media/${identity.branding.logoMediaId}`}
              alt=""
              width="96"
              height="96"
            />
          )}
        <h1>{displayText(identity.name, locale)}</h1>
      </div>
      <p>{displayText(identity.description, locale)}</p>
      <p>
        <RegistrationStateName company={identity} /> · {label(identity.status, locale)} ·{' '}
        <time dateTime={identity.foundedAt}>
          {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
            new Date(identity.foundedAt),
          )}
        </time>
      </p>
      <ul>
        {categories.map((category) => (
          <li key={category}>{category}</li>
        ))}
      </ul>
    </header>
  );
}
export { CompanyProfileHeader };
