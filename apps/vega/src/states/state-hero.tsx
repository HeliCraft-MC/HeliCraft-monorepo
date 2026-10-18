import { useSiteBranding } from '../site-branding';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from './text';
import { BannerPreview } from './banner-preview';
import styles from './public-detail.module.scss';

function StateHero({
  state,
  publicView,
  flagUrl,
}: Readonly<{ state: StateDetail; publicView: boolean; flagUrl?: string }>): ReactElement {
  const { locale } = useTranslation();
  const { serverName } = useSiteBranding();
  const { configuration } = state;
  const horizontalLabel = uiText(locale, 'Флаг государства', 'State flag');
  return (
    <header className={styles.hero}>
      <div className={styles.identity}>
        <div className={styles.eyebrow}>
          {uiText(locale, `Государство ${serverName}`, `${serverName} state`)}{' '}
          <span className={styles.status}>{label(state.status, locale)}</span>
        </div>
        <h1>{displayText(configuration.name, locale)}</h1>
        <p className={styles.description}>{displayText(configuration.description, locale)}</p>
        {!publicView && state.statusReason !== null && <p>{state.statusReason}</p>}
        <dl className={styles.stats}>
          <div>
            <dt>{uiText(locale, 'Граждане', 'Citizens')}</dt>
            <dd>{state.citizens.length}</dd>
          </div>
          <div>
            <dt>{uiText(locale, 'Должности', 'Offices')}</dt>
            <dd>{configuration.governance.offices.length}</dd>
          </div>
          <div>
            <dt>{uiText(locale, 'Редакция устройства', 'Governance revision')}</dt>
            <dd>{state.governanceRevision}</dd>
          </div>
        </dl>
      </div>
      <figure className={styles.flagStage}>
        {configuration.horizontalFlag.mode === 'BANNER' ? (
          <BannerPreview
            design={configuration.horizontalFlag.design}
            horizontal
            label={horizontalLabel}
          />
        ) : (
          <img src={flagUrl ?? `/api/v1/public/states/${state.slug}/flag`} alt={horizontalLabel} />
        )}
        <figcaption>{horizontalLabel}</figcaption>
      </figure>
    </header>
  );
}
export { StateHero };
