// oxlint-disable import/max-dependencies -- The public profile composes separate legal identity, governance, ownership and published history sections.
import type { ReactElement } from 'react';
import type { PublishedCompanyProfile, PublishedCompanyBranchList } from '@helicraft/alhena';
import { PageContainer } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import { EntityMarkdown } from '../entity-markdown';
import { ProfileGovernance } from './profile-governance';
import { ProfileOwnership } from './profile-ownership';
import { ProfilePagination } from './profile-pagination';
import { companyActionLabel } from './labels';
import type { ProfileSearch } from './profile-search';
import styles from './companies.module.scss';

function CompanyProfilePage({
  profile,
  branches,
  search,
  missing,
}: Readonly<{
  profile: PublishedCompanyProfile | null;
  branches: PublishedCompanyBranchList | null;
  search: ProfileSearch;
  missing: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  if (profile === null) {
    return (
      <main id="main-content">
        <PageContainer>
          <section className={styles.page}>
            <h1>
              {missing
                ? uiText(locale, 'Компания не найдена', 'Company not found')
                : uiText(locale, 'Страница временно недоступна', 'Page temporarily unavailable')}
            </h1>
            <a href="/companies">{uiText(locale, 'Каталог компаний', 'Company catalogue')}</a>
          </section>
        </PageContainer>
      </main>
    );
  }
  return (
    <main id="main-content">
      <PageContainer>
        <article className={styles.page}>
          <header>
            <a href="/companies">{uiText(locale, 'Все компании', 'All companies')}</a>
            <a href={`/app/companies/${profile.identity.id}`}>
              {uiText(locale, 'Рабочее пространство компании', 'Company workspace')}
            </a>
            <h1>{displayText(profile.identity.name, locale)}</h1>
            <p>{displayText(profile.identity.description, locale)}</p>
            <p>
              {displayText(profile.identity.registrationStateName, locale)} ·{' '}
              {label(profile.identity.status, locale)} ·{' '}
              <time dateTime={profile.identity.foundedAt}>
                {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                  new Date(profile.identity.foundedAt),
                )}
              </time>
            </p>
            <ul>
              {profile.categories.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          </header>
          <ProfileGovernance profile={profile} />
          <section className={styles.card}>
            <h2>
              {uiText(locale, 'Устав', 'Charter')} · {uiText(locale, 'Редакция', 'Revision')}{' '}
              {profile.revision}
            </h2>
            {profile.documentHtml === '' ? (
              <p>
                {uiText(
                  locale,
                  'Дополнительный текст устава отсутствует.',
                  'No additional charter document.',
                )}
              </p>
            ) : (
              <EntityMarkdown html={profile.documentHtml} />
            )}
          </section>
          <ProfileOwnership profile={profile} search={search} />
          <section className={styles.card}>
            <h2>{uiText(locale, 'Филиалы', 'Branches')}</h2>
            {branches === null && (
              <p>
                {uiText(
                  locale,
                  'Сведения временно недоступны.',
                  'Information temporarily unavailable.',
                )}
              </p>
            )}
            {branches?.items.length === 0 && (
              <p>{uiText(locale, 'Опубликованных филиалов нет.', 'No published branches.')}</p>
            )}
            <ul>
              {branches?.items.map((branch) => (
                <li key={branch.id}>
                  {displayText(branch.name, locale)} · {displayText(branch.stateName, locale)} ·{' '}
                  {label(branch.status, locale)}
                  <p>{displayText(branch.description, locale)}</p>
                </li>
              ))}
            </ul>
            <ProfilePagination
              id={profile.identity.id}
              search={search}
              field="branchesPage"
              hasMore={branches?.hasMore ?? false}
            />
          </section>
          <section className={styles.card}>
            <h2>{uiText(locale, 'Публичная история решений', 'Public decision history')}</h2>
            {profile.history.items.length === 0 && (
              <p>
                {uiText(
                  locale,
                  'После учреждения публичных решений ещё нет.',
                  'No public decisions since registration.',
                )}
              </p>
            )}
            <ol>
              {profile.history.items.map((event) => (
                <li key={event.id}>
                  {companyActionLabel(event.kind, locale)} ·{' '}
                  <time dateTime={event.appliedAt}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(event.appliedAt))}
                  </time>
                </li>
              ))}
            </ol>
            <ProfilePagination
              id={profile.identity.id}
              search={search}
              field="historyPage"
              hasMore={profile.history.hasMore}
            />
          </section>
        </article>
      </PageContainer>
    </main>
  );
}
export { CompanyProfilePage };
