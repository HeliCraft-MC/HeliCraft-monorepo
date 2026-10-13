import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { PublicPlayerProfile } from '@helicraft/alhena';
import { MinecraftAvatar } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { displayText, uiText } from './states/text';
import { formatDate } from './date-format';
import styles from './player-public-page.module.scss';

interface StateAccent extends CSSProperties {
  readonly '--state-accent': string;
}
function PublicPlayerPage({ player }: Readonly<{ player: PublicPlayerProfile }>): ReactElement {
  const { locale } = useTranslation();
  const accents = useMemo(
    () =>
      new Map(
        player.states.map((state): [string, StateAccent] => [
          state.id,
          { '--state-accent': state.color },
        ]),
      ),
    [player.states],
  );
  const citizenships = player.states.filter((state) => state.citizenSince !== null);
  const officeCount = player.states.reduce((total, state) => total + state.offices.length, 0);
  return (
    <article className={styles.page}>
      <a className={styles.back} href="/">
        ← HeliCraft
      </a>
      <header className={styles.hero}>
        <div className={styles.portrait}>
          <MinecraftAvatar
            name={player.name}
            size={112}
            src={`/api/v1/public/players/${player.id}/avatar.png?v=${player.skinId ?? 'default'}`}
          />
        </div>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>
            {uiText(locale, 'Профиль игрока', 'Player profile')}
          </span>
          <h1>{player.name}</h1>
          <p>
            {uiText(locale, 'На HeliCraft с', 'Joined HeliCraft on')}{' '}
            <time dateTime={player.registeredAt}>{formatDate(player.registeredAt, locale)}</time>
          </p>
        </div>
        <dl className={styles.stats}>
          <div>
            <dt>{uiText(locale, 'Гражданства', 'Citizenships')}</dt>
            <dd>{citizenships.length}</dd>
          </div>
          <div>
            <dt>{uiText(locale, 'Должности', 'Offices')}</dt>
            <dd>{officeCount}</dd>
          </div>
        </dl>
      </header>
      <section className={styles.section}>
        <span className={styles.eyebrow}>
          {uiText(locale, 'В мире HeliCraft', 'In the world of HeliCraft')}
        </span>
        <h2>{uiText(locale, 'Государства и должности', 'States and offices')}</h2>
        {player.states.length === 0 ? (
          <div className={styles.empty}>
            <h3>{uiText(locale, 'Пока без государства', 'No state yet')}</h3>
            <p>
              {uiText(
                locale,
                'У игрока пока нет гражданства или основанных им публичных государств.',
                'This player has no citizenships or founded public states yet.',
              )}
            </p>
            <a href="/states">{uiText(locale, 'Открыть каталог государств', 'Browse states')} →</a>
          </div>
        ) : (
          <div className={styles.grid}>
            {player.states.map((state) => (
              <article key={state.id} className={styles.state} style={accents.get(state.id)}>
                <h3>
                  <a href={`/states/${state.slug}`}>{displayText(state.name, locale)} ↗</a>
                </h3>
                <div className={styles.badges}>
                  {state.founder && <span>{uiText(locale, 'Основатель', 'Founder')}</span>}
                  {state.citizenSince !== null && (
                    <span>{uiText(locale, 'Гражданин', 'Citizen')}</span>
                  )}
                </div>
                {state.citizenSince !== null && (
                  <p className={styles.muted}>
                    {uiText(locale, 'Гражданство с', 'Citizen since')}{' '}
                    <time dateTime={state.citizenSince}>
                      {formatDate(state.citizenSince, locale)}
                    </time>
                  </p>
                )}
                {state.offices.length > 0 && (
                  <ul className={styles.offices}>
                    {state.offices.map((office) => (
                      <li key={office.id}>
                        <strong>{displayText(office.name, locale)}</strong>
                        {office.isHeadOfState && (
                          <small>{uiText(locale, 'Глава государства', 'Head of state')}</small>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
export { PublicPlayerPage };
