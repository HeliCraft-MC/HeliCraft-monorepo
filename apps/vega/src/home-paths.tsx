import type { ReactElement } from 'react';
import styles from './home.module.scss';

function HomePaths(): ReactElement {
  return (
    <section className={styles.chapter}>
      <p className={styles.eyebrow}>02 / Две стороны одной игры</p>
      <h2>
        Один мир.
        <br />
        Два способа влиять на него.
      </h2>
      <div className={styles.twoSides}>
        <div>
          <span className={styles.mono}>ВНУТРИ MINECRAFT</span>
          <h3>Живи в мире.</h3>
          <p>Строй, исследуй, находи ресурсы. Создавай поселения и знакомься с людьми.</p>
          <span className={styles.wordmark} aria-hidden="true">
            ▧ ▧ ▧
          </span>
        </div>
        <div>
          <span className={styles.mono}>НА САЙТЕ HELICRAFT</span>
          <h3>Придай ему смысл.</h3>
          <p>
            Аккаунт, собственный облик и летопись уже здесь. Общественные решения, государства и
            экономика — следующие главы разработки.
          </p>
          <span className={styles.wordmark} aria-hidden="true">
            ↗ ─ ↗
          </span>
        </div>
      </div>
      <p className={styles.future}>
        Будущий игровой цикл: построил поселение → создал государство → принял решение → мир
        изменился.
      </p>
    </section>
  );
}
export { HomePaths };
