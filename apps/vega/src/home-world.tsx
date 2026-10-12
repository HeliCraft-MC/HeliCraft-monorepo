import { useMemo } from 'react';
import { Icon, StateCard } from '@helicraft/atria';
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
function HomeWorld(): ReactElement {
  const { text } = useTranslation();
  const facts0 = useMemo(
    () => [
      { label: text('home.states.decisions'), value: text('home.states.republicDecisions') },
      { label: text('home.states.foundation'), value: text('home.states.republicFoundation') },
    ],
    [text],
  );
  const facts1 = useMemo(
    () => [
      { label: text('home.states.decisions'), value: text('home.states.monarchyDecisions') },
      { label: text('home.states.foundation'), value: text('home.states.monarchyFoundation') },
    ],
    [text],
  );
  const facts2 = useMemo(
    () => [
      { label: text('home.states.decisions'), value: text('home.states.democracyDecisions') },
      { label: text('home.states.foundation'), value: text('home.states.democracyFoundation') },
    ],
    [text],
  );

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
          <a href="/world">
            {text('home.states.readMore')} <Icon name="arrowRight" />
          </a>
        </div>
        <div className={styles.states}>
          <StateCard
            flagLabel={text('home.states.flagLabel')}
            name={text('home.states.republicTitle')}
            flag="/world/flags/aurora.svg"
            government={text('home.states.republicGovernment')}
            image="/world/town-small.webp"
            description={text('home.states.republicDescription')}
            facts={facts0}
          />
          <StateCard
            flagLabel={text('home.states.flagLabel')}
            name={text('home.states.monarchyTitle')}
            flag="/world/flags/veloria.svg"
            government={text('home.states.monarchyGovernment')}
            image="/world/castle-small.webp"
            description={text('home.states.monarchyDescription')}
            facts={facts1}
          />
          <StateCard
            flagLabel={text('home.states.flagLabel')}
            name={text('home.states.democracyTitle')}
            flag="/world/flags/lor.svg"
            government={text('home.states.democracyGovernment')}
            description={text('home.states.democracyDescription')}
            facts={facts2}
          />
        </div>
      </section>
    </>
  );
}
export { HomeWorld };
