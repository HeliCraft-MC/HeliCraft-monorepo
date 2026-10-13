import { Icon } from '@helicraft/atria';
import { PublicStateCard } from './states/public-card';
import type { HomeData } from './home-data';
import { uiText } from './states/text';
import { useTranslation } from './i18n';
import type { ReactElement } from 'react';
import styles from './home.module.scss';

const principles = [
  {
    name: 'home.principles.territoryTitle',
    text: 'home.principles.territoryDescription',
  },
  {
    name: 'navigation.states',
    text: 'home.principles.statesDescription',
  },
  {
    name: 'home.principles.economyTitle',
    text: 'home.principles.economyDescription',
  },
  {
    name: 'navigation.chronicle',
    text: 'home.principles.chronicleDescription',
  },
];
function HomeWorld({ states }: Readonly<{ states: HomeData['states'] }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <>
      <section id="about" className={styles.chapter}>
        <div className={styles.about}>
          <div>
            <h2>{text('home.about.title')}</h2>
            <p className={styles.note}>{text('home.about.description')}</p>
          </div>
          <div className={styles.principles}>
            {principles.map((principle) => (
              <article key={principle.name}>
                <h3>{text(principle.name)}</h3>
                <p>{text(principle.text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.chapter} id="states">
        <div className={styles.sectionHead}>
          <div>
            <h2>{text('home.states.title')}</h2>
            <p className={styles.note}>{text('home.states.description')}</p>
          </div>
          <a href="/states">
            {text('home.states.readMore')} <Icon name="arrowRight" />
          </a>
        </div>
        <div className={styles.states}>
          {states?.items.map((state) => (
            <PublicStateCard key={state.id} state={state} />
          ))}
        </div>
        {states === null && (
          <output>
            {uiText(
              locale,
              'Государства временно недоступны. Попробуйте позже.',
              'States are temporarily unavailable. Please try again later.',
            )}
          </output>
        )}
        {states !== null && states.total === 0 && (
          <p>
            {uiText(
              locale,
              'Пока нет одобренных государств. Станьте основателем первого.',
              'No approved states yet. Become the founder of the first one.',
            )}
          </p>
        )}
        {states !== null && states.total > 0 && (
          <p className={styles.note}>
            {uiText(locale, 'Государств в каталоге:', 'States in the directory:')} {states.total}
          </p>
        )}
        <a href="/app/states/new">
          {uiText(locale, 'Создать государство', 'Create a state')} <Icon name="arrowUpRight" />
        </a>
      </section>
    </>
  );
}
export { HomeWorld };
