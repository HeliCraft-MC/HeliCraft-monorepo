import { formatDate } from './date-format';
import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import type { HomeData } from './home-data';
import styles from './home.module.scss';

function HomeChronicle({ data }: Readonly<{ data: HomeData }>): ReactElement {
  const { chronicle } = data;
  return (
    <section className={styles.chapter}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>01 / Мир сейчас</p>
          <h2>Мир не стоит на месте.</h2>
        </div>
        <Link to="/chronicle">Вся летопись →</Link>
      </div>
      <p className={styles.lead}>
        События, решения и истории людей, которые делают HeliCraft своим миром.
      </p>
      {chronicle === null ? (
        <div className={styles.empty}>
          <h3>Летопись временно недоступна.</h3>
          <p>Истории появятся здесь после восстановления связи. Мир продолжается.</p>
        </div>
      ) : null}
      {chronicle !== null && chronicle.items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.chapterNumber} aria-hidden="true">
            I
          </span>
          <div>
            <p className={styles.eyebrow}>До первой главы</p>
            <h3>Первая глава ещё пишется.</h3>
            <p>
              Мир находится в становлении. Его история начинается с людей, которые решат сделать его
              своим.
            </p>
            <Link to={data.site.registrationEnabled ? '/register' : '/start'}>
              Стать частью начала →
            </Link>
          </div>
        </div>
      ) : null}
      {chronicle !== null && chronicle.items.length > 0 ? (
        <div className={styles.editorial}>
          {chronicle.items.map((entry) => (
            <article key={entry.id}>
              <p className={styles.eyebrow}>
                {entry.category} / {formatDate(entry.publishedAt)}
              </p>
              <h3>
                <a href={`/chronicle/${entry.slug}`}>{entry.title}</a>
              </h3>
              <p>{entry.description}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
export { HomeChronicle };
