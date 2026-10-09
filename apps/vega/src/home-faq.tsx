import type { ReactElement } from 'react';
import styles from './home.module.scss';

function HomeFaq(): ReactElement {
  return (
    <section className={`${styles.chapter} ${styles.faq}`}>
      <h2>Несколько простых ответов.</h2>
      <details>
        <summary>Нужно ли вступать в государство?</summary>
        <p>Нет. Независимая игра допустима. Государственные механики пока разрабатываются.</p>
      </details>
      <details>
        <summary>Нужны ли моды?</summary>
        <p>Нет. Обязательные клиентские модификации не требуются.</p>
      </details>
      <details>
        <summary>Нужно ли постоянно участвовать в политике?</summary>
        <p>
          Нет. Социальные механики дадут дополнительные возможности и сохранят обычный Minecraft.
        </p>
      </details>
      <details>
        <summary>Это обычный Minecraft-сервер?</summary>
        <p>
          Это Minecraft с дополнительным связанным веб-миром. Веб-аккаунты, скины и летопись
          составляют его первый фундамент; игровые системы ещё в разработке.
        </p>
      </details>
    </section>
  );
}
export { HomeFaq };
