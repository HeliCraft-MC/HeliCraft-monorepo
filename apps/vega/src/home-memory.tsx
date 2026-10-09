import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import styles from './home.module.scss';

function HomeMemory(): ReactElement {
  return (
    <section className={`${styles.chapter} ${styles.memory}`}>
      <p className={styles.eyebrow}>04 / Мир помнит</p>
      <h2>
        Проходят дни.
        <br />
        <span>Истории остаются.</span>
      </h2>
      <div className={styles.memoryBody}>
        <span className={styles.timeMark}>
          ПЕРВЫЙ БЛОК
          <br />↓<br />
          ПЕРВАЯ УЛИЦА
          <br />↓<br />
          ОБЩАЯ ИСТОРИЯ
        </span>
        <div>
          <p>
            Город начинается с первого блока. Потом в нём появляются улицы, знакомые лица, свои
            традиции и история.
          </p>
          <p>
            Мы хотим, чтобы у созданного игроками было продолжение, а не только дата следующего
            вайпа. Постоянство мира — наша цель, а его история — то, что мы будем беречь.
          </p>
          <Link to="/chronicle">Читать летопись →</Link>
        </div>
      </div>
    </section>
  );
}
export { HomeMemory };
