import type { ReactElement } from 'react';
import type { PublishedCompanyProfile } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { LegalIdentity } from './legal-identity';
import { ProfilePagination } from './profile-pagination';
import type { ProfileSearch } from './profile-search';
import styles from './companies.module.scss';

const PERCENTAGE_DECIMALS = 2;

function shareRatio(shares: string, total: string): string {
  if (BigInt(total) === 0n) {
    return '0';
  }
  const percentageHundredths = (BigInt(shares) * 10_000n) / BigInt(total);
  return `${percentageHundredths / 100n}.${(percentageHundredths % 100n).toString().padStart(PERCENTAGE_DECIMALS, '0')}`;
}
function ProfileOwnership({
  profile,
  search,
}: Readonly<{ profile: PublishedCompanyProfile; search: ProfileSearch }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <section className={styles.card}>
        <h2>{uiText(locale, 'Акционеры', 'Shareholders')}</h2>
        <FieldHelp
          label={uiText(locale, 'Акции и доли', 'Shares and ownership')}
          content={uiText(
            locale,
            'Акции учитываются целыми числами. Точная доля — отношение принадлежащих акций к общему выпуску; процент ниже округлён вниз до двух знаков.',
            'Shares are whole numbers. The exact ownership fraction is held shares divided by issued shares; percentages below are rounded down to two decimal places.',
          )}
        />
        <p>
          {uiText(locale, 'Всего выпущено акций', 'Total issued shares')}: {profile.issuedShares}
        </p>
        <ul>
          {profile.owners.items.map((position) => (
            <li key={position.identity.owner.id}>
              <LegalIdentity identity={position.identity} />: {position.shares} /{' '}
              {profile.issuedShares} ({shareRatio(position.shares, profile.issuedShares)}%)
            </li>
          ))}
        </ul>
        <ProfilePagination
          id={profile.identity.id}
          search={search}
          field="ownersPage"
          hasMore={profile.owners.hasMore}
        />
      </section>
      <section className={styles.card}>
        <h2>{uiText(locale, 'Корпоративное владение', 'Corporate holdings')}</h2>
        <FieldHelp
          label={uiText(locale, 'Дочерняя компания', 'Subsidiary')}
          content={uiText(
            locale,
            'Более половины выпущенных акций означает контроль по капиталу. Каждая компания сохраняет отдельную юридическую идентичность, устав и деньги.',
            'Holding more than half of issued shares means capital control. Each company retains its own legal identity, charter and funds.',
          )}
        />
        {profile.holdings.items.length === 0 && (
          <p>
            {uiText(
              locale,
              'Долей в других учреждённых компаниях нет.',
              'No holdings in other registered companies.',
            )}
          </p>
        )}
        <ul>
          {profile.holdings.items.map((position) => (
            <li key={position.identity.owner.id}>
              <LegalIdentity identity={position.identity} />: {position.shares} /{' '}
              {position.issuedShares} ({shareRatio(position.shares, position.issuedShares)}%).{' '}
              {position.controls && uiText(locale, 'Дочерняя компания', 'Subsidiary')}
            </li>
          ))}
        </ul>
        <ProfilePagination
          id={profile.identity.id}
          search={search}
          field="holdingsPage"
          hasMore={profile.holdings.hasMore}
        />
      </section>
    </>
  );
}
export { ProfileOwnership };
