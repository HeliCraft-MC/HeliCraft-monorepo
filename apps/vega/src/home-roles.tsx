import type { ReactElement } from 'react';
import styles from './home.module.scss';

function HomeRoles(): ReactElement {
  return (
    <section className={styles.chapter}>
      <p className={styles.eyebrow}>03 / Найди своё место</p>
      <h2>
        Здесь не нужно играть
        <br />
        по чужому сценарию.
      </h2>
      <div className={styles.roles}>
        <article>
          <span className={styles.roleArt} aria-hidden="true">
            ↗<br />
            ╱╲
          </span>
          <p className={styles.mono}>ИССЛЕДОВАТЕЛЬ</p>
          <h3>Открывай неизвестное.</h3>
          <p>Находи интересные места, изучай географию и прокладывай собственный путь.</p>
        </article>
        <article>
          <span className={styles.roleArt} aria-hidden="true">
            ▥<br />▤ ▥
          </span>
          <p className={styles.mono}>СОЗДАТЕЛЬ</p>
          <h3>Построй нечто большее.</h3>
          <p>От первого дома до города. Создавай места, к которым захочется возвращаться.</p>
        </article>
        <article>
          <span className={styles.roleArt} aria-hidden="true">
            ◎<br />
            ┄┄┄
          </span>
          <p className={styles.mono}>УЧАСТНИК ИСТОРИИ</p>
          <h3>Влияй на мир.</h3>
          <p>Присоединяйся к сообществу и помогай определять будущее общих проектов.</p>
        </article>
      </div>
    </section>
  );
}
export { HomeRoles };
