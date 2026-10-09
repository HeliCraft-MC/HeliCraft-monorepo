import type { ReactElement } from 'react';

export function MissingPage(): ReactElement {
  return (
    <main>
      <h1>Страница не найдена</h1>
      <p>Эта глава ещё не написана.</p>
      <a href="/">Вернуться на главную</a>
    </main>
  );
}
