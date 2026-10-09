import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import type { HomeData } from './home-data';
import styles from './home.module.scss';

function HomeStart({ data }: Readonly<{ data: HomeData }>): ReactElement {
  const { site } = data;
  return (
    <section className={styles.chapter}>
      <p className={styles.eyebrow}>05 / Как начать</p>
      <h2>Твоя история начинается здесь.</h2>
      <div className={styles.steps}>
        <article>
          <span>01</span>
          <h3>Создай аккаунт.</h3>
          <p>Придумай ник и пароль. Получи постоянный UUID HeliCraft.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Подготовь Minecraft.</h3>
          <p>Обычный Minecraft Java Edition. Обязательные клиентские моды не нужны.</p>
        </article>
        <article>
          <span>03</span>
          <h3>{site.phase === 'OPEN' ? 'Присоединяйся к миру.' : 'Дождись открытия мира.'}</h3>
          <p>
            {site.phase === 'OPEN' && site.minecraftAddress !== null
              ? `Адрес сервера: ${site.minecraftAddress}`
              : 'Игровое подключение через HeliCraft identity появится после отдельного этапа разработки. Следи за летописью.'}
          </p>
        </article>
      </div>
      <Link className={styles.primary} to="/start">
        Подробнее о первых шагах →
      </Link>
    </section>
  );
}
export { HomeStart };
