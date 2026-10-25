import { Icon } from '@helicraft/atria';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { PlayerNickname } from '../player-nickname';
import { BannerPreview } from './banner-preview';
import { label, uiText } from './text';
import styles from './public-detail.module.scss';

function StateOverview({ state }: Readonly<{ state: StateDetail }>): ReactElement {
  const { locale } = useTranslation();
  const { configuration } = state;
  const verticalLabel = uiText(locale, 'Вертикальный баннер', 'Vertical banner');
  return (
    <section id="state-overview" className={styles.section}>
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}>01 / {uiText(locale, 'Государство', 'State')}</span>
        <h2>{uiText(locale, 'Люди и символы', 'People and symbols')}</h2>
      </div>
      <div className={styles.overview}>
        <section className={styles.panel}>
          <h3>{uiText(locale, 'Основатели', 'Founders')}</h3>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Игроки, стоявшие у основания государства.',
              'The players who founded this state.',
            )}
          </p>
          <ul className={styles.people}>
            {state.founders
              .toSorted(
                (first, second) =>
                  Number(second.type === 'PRIMARY') - Number(first.type === 'PRIMARY'),
              )
              .map((founder) => (
                <li key={founder.id}>
                  <PlayerNickname id={founder.id} name={founder.name} size={44} />
                  <small>
                    {uiText(
                      locale,
                      founder.type === 'PRIMARY' ? 'Основатель' : 'Сооснователь',
                      founder.type === 'PRIMARY' ? 'Founder' : 'Cofounder',
                    )}
                  </small>
                </li>
              ))}
          </ul>
        </section>
        <section className={styles.panel}>
          <h3>{uiText(locale, 'Гражданство', 'Citizenship')}</h3>
          <strong>{label(configuration.citizenship.entryMode, locale)}</strong>
          <p>
            {uiText(
              locale,
              configuration.citizenship.allowMultipleCitizenships
                ? 'Гражданам разрешено состоять в нескольких государствах.'
                : 'Гражданство нескольких государств не разрешено.',
              configuration.citizenship.allowMultipleCitizenships
                ? 'Citizens may hold citizenship in multiple states.'
                : 'Citizenship in multiple states is not allowed.',
            )}
          </p>
          <a href="#state-citizens">
            {uiText(locale, 'Посмотреть граждан', 'View citizens')} <Icon name="arrowRight" />
          </a>
        </section>
        <figure className={styles.symbol}>
          <BannerPreview design={configuration.verticalBanner} label={verticalLabel} />
          <figcaption>{verticalLabel}</figcaption>
        </figure>
      </div>
    </section>
  );
}
export { StateOverview };
