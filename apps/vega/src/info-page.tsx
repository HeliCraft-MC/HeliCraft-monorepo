import { useLoaderData, useLocation } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { MarkdownContent, PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

const information: Record<string, { title: string; paragraphs: readonly string[] }> = {
  '/world': {
    title: 'Один мир. Много историй.',
    paragraphs: [
      'HeliCraft — постоянный Minecraft-мир для исследователей, строителей и сообществ. Здесь можно жить независимо, строить дом и играть вместе с друзьями.',
      'Minecraft — место, где события происходят физически. Сайт — место, где у них появится социальный, политический и экономический смысл.',
      'Сейчас проект находится в разработке. Аккаунты, постоянные UUID, скины и редакционная летопись — первый фундамент. Государства, экономика и игровые институты появятся позднее.',
    ],
  },
  '/start': {
    title: 'Твоя история начинается здесь.',
    paragraphs: [
      '01 — Создай аккаунт. Придумай ник из 3–16 латинских букв, цифр или подчёркиваний и пароль минимум из 12 символов. UUID останется с тобой при любых переименованиях.',
      '02 — Подготовь Minecraft Java Edition. Обязательные клиентские моды не нужны.',
      '03 — Следи за открытием мира в летописи. Веб-аккаунт пока не заменяет официальную Minecraft-аутентификацию. Игровой вход через HeliCraft identity будет отдельным этапом.',
      'Храни пароль в менеджере паролей. Email и восстановление доступа пока не предусмотрены.',
    ],
  },
  '/rules': {
    title: 'Правила сообщества.',
    paragraphs: [
      'Уважай других игроков. Недопустимы травля, угрозы, дискриминация и публикация чужих персональных данных.',
      'Не используй чужую личность и не пытайся получить доступ к чужому аккаунту. Не передавай пароль другим людям.',
      'Не используй ошибки платформы для получения преимуществ. Сообщай о найденных проблемах администрации.',
      'Игровые правила будут опубликованы перед открытием мира. Этот раздел описывает действующие базовые правила веб-сообщества.',
    ],
  },
};
export function InfoPage(): ReactElement {
  const data = useLoaderData({ strict: false });
  const location = useLocation();
  if (
    data !== undefined &&
    'content' in data &&
    data.content !== null &&
    data.content !== undefined
  ) {
    return (
      <main id="main-content" className={styles.page}>
        <PageContainer narrow>
          <h1>{data.content.document.title}</h1>
          <MarkdownContent html={data.content.document.html} />
        </PageContainer>
      </main>
    );
  }
  const content = information[location.pathname];
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <p className={styles.eyebrow}>HeliCraft / Перед первой главой</p>
        <h1>{content?.title ?? 'HeliCraft'}</h1>
        {content?.paragraphs.map((paragraph) => (
          <p className={styles.paragraph} key={paragraph}>
            {paragraph}
          </p>
        ))}
      </PageContainer>
    </main>
  );
}
