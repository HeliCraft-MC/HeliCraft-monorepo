import type { ReactElement } from 'react';
import type { Treaty } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { StateName } from '../state-name';
import { BannerPreview } from '../states/banner-preview';
import styles from './parties.module.scss';

function TreatyParties({ parties }: Readonly<{ parties: Treaty['parties'] }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <ol className={styles.parties}>
      {parties.map((party) => (
        <li key={party.id}>
          {party.flag !== null && (
            <figure>
              {party.flag.horizontal.mode === 'BANNER' ? (
                <BannerPreview
                  design={party.flag.horizontal.design}
                  horizontal
                  label={uiText(locale, 'Флаг государства', 'State flag')}
                />
              ) : (
                <img
                  src={`/api/v1/public/states/${party.slug ?? ''}/flag`}
                  alt={uiText(locale, 'Флаг государства', 'State flag')}
                />
              )}
            </figure>
          )}
          {party.slug !== null && party.color !== null ? (
            <StateName
              name={displayText(party.name, locale)}
              slug={party.slug}
              color={party.color}
              href={`/states/${party.slug}`}
            />
          ) : (
            <span>
              {displayText(party.name, locale) ||
                uiText(locale, 'Государство недоступно', 'State unavailable')}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
export { TreatyParties };
