import { useSiteBranding } from './site-branding';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { PublicPlayerProfile } from '@helicraft/alhena';
import { Icon, MinecraftAvatar, StateCard } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { displayText, uiText } from './states/text';
import { formatDate } from './date-format';
import styles from './player-public-page.module.scss';

function PublicPlayerPage({ player }: Readonly<{ player: PublicPlayerProfile }>): ReactElement {
  const { locale } = useTranslation();
  const { serverName } = useSiteBranding();
  const facts = useMemo(
    () =>
      new Map(
        player.states.map((state) => [
          state.id,
          state.offices.map((office) => ({
            label: displayText(office.name, locale),
            value: uiText(
              locale,
              office.isHeadOfState ? 'Глава государства' : 'Должностное лицо',
              office.isHeadOfState ? 'Head of state' : 'Office holder',
            ),
          })),
        ]),
      ),
    [player.states, locale],
  );
  const citizenships = player.states.filter((state) => state.citizenSince !== null);
  const officeCount = player.states.reduce((total, state) => total + state.offices.length, 0);
  return (
    <article className={styles.page}>
      <a className={styles.back} href="/">
        <Icon name="arrowLeft" /> {serverName}
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
            {uiText(locale, `На ${serverName} с`, `Joined ${serverName} on`)}{' '}
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
          {uiText(locale, `В мире ${serverName}`, `In the world of ${serverName}`)}
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
            <a href="/states">
              {uiText(locale, 'Открыть каталог государств', 'Browse states')}{' '}
              <Icon name="arrowRight" />
            </a>
          </div>
        ) : (
          <div className={styles.grid}>
            {player.states.map((state) => (
              <StateCard
                key={state.id}
                name={displayText(state.name, locale)}
                color={state.color}
                href={`/states/${state.slug}`}
                flag={null}
                government={uiText(
                  locale,
                  state.founder ? 'Основатель' : 'Гражданин',
                  state.founder ? 'Founder' : 'Citizen',
                )}
                description={
                  state.citizenSince === null
                    ? undefined
                    : `${uiText(locale, 'Гражданство с', 'Citizen since')} ${formatDate(state.citizenSince, locale)}`
                }
                facts={facts.get(state.id)}
              />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
export { PublicPlayerPage };
