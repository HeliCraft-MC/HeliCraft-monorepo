import { useMemo } from 'react';
import { PlayerNickname } from '../player-nickname';
import { uiText, displayText, label } from './text';
import { EMPTY_FOUNDERS, EMPTY_HTML } from './empty';
import type { CSSProperties, ReactElement } from 'react';
import type { StateConfiguration, StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { BannerPreview } from './banner-preview';
import { GovernmentSummary } from './government';
import { ConstitutionDocument } from './constitution';
import styles from './states.module.scss';

function StateReview({
  configuration,
  founders = EMPTY_FOUNDERS,
  html = EMPTY_HTML,
  publicSlug,
  flagUrl,
  holders,
  showConstitution = true,
}: Readonly<{
  configuration: StateConfiguration;
  founders?: StateDetail['founders'];
  html?: StateDetail['constitutionHtml'];
  publicSlug?: string;
  flagUrl?: string;
  holders?: StateDetail['holders'];
  showConstitution?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const color = useMemo<CSSProperties>(
    () => ({ background: configuration.color }),
    [configuration.color],
  );
  return (
    <section className={styles.editor}>
      <h2>
        {displayText(configuration.name, locale) || uiText(locale, 'Без названия', 'Unnamed')}
      </h2>
      <p>{displayText(configuration.description, locale)}</p>
      <dl className={styles.reviewIdentity}>
        <div>
          <dt>{uiText(locale, 'Адрес публичной страницы', 'Public page address')}</dt>
          <dd>
            <span>/states/{configuration.slug}</span>
            <p className={styles.hint}>
              {uiText(
                locale,
                'По этому адресу игроки смогут найти государство после одобрения.',
                'Players can find the state at this address after approval.',
              )}
            </p>
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Цвет государства на сайте', 'State color on the site')}</dt>
          <dd>
            <span className={styles.colorSwatch} style={color} aria-hidden="true" />
          </dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <BannerPreview design={configuration.verticalBanner} />
        {configuration.horizontalFlag.mode === 'BANNER' ? (
          <BannerPreview design={configuration.horizontalFlag.design} horizontal />
        ) : (
          configuration.horizontalFlag.mediaId !== null && (
            <img
              className={styles.flag}
              alt={uiText(locale, 'Горизонтальный флаг', 'Horizontal flag')}
              src={
                flagUrl ??
                (publicSlug === undefined
                  ? `/api/v1/account/state-flags/${configuration.horizontalFlag.mediaId}`
                  : `/api/v1/public/states/${publicSlug}/flag`)
              }
            />
          )
        )}
      </div>
      <h3>{uiText(locale, 'Основатели', 'Founders')}</h3>
      <ul>
        {founders.map((founder) => (
          <li key={founder.id}>
            <PlayerNickname id={founder.id} name={founder.name} /> ·{' '}
            {founder.type === 'PRIMARY'
              ? uiText(locale, 'Основатель', 'Primary founder')
              : uiText(locale, 'Сооснователь', 'Cofounder')}
          </li>
        ))}
      </ul>
      <h3>{uiText(locale, 'Гражданство', 'Citizenship')}</h3>
      <p>
        {label(configuration.citizenship.entryMode, locale)} ·{' '}
        {configuration.citizenship.allowMultipleCitizenships
          ? uiText(locale, 'Несколько гражданств разрешено', 'Multiple citizenships allowed')
          : uiText(locale, 'Одно гражданство', 'Single citizenship')}
      </p>
      <GovernmentSummary configuration={configuration} founders={founders} holders={holders} />
      {showConstitution && (
        <ConstitutionDocument
          configuration={configuration}
          founders={founders}
          html={html}
          showGovernanceWhenAbsent={false}
        />
      )}
    </section>
  );
}
export { StateReview };
