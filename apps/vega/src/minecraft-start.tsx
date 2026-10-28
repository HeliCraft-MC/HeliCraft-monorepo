import type { ReactElement } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './minecraft.module.scss';

function MinecraftStart({ username }: Readonly<{ username: string }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.start}>
      <Gamepad2 className={styles.startIcon} aria-hidden="true" />
      <h2>{uiText(locale, 'Всё начинается в игре', 'Start in Minecraft')}</h2>
      <p>
        {uiText(
          locale,
          'Сейчас запросов на вход нет. Подключитесь к серверу, чтобы начать.',
          'There are no pending sign-ins. Connect to the server to get started.',
        )}
      </p>
      <ol className={styles.steps}>
        <li>
          {uiText(locale, 'Войдите в Minecraft под именем', 'Open Minecraft with the username')}{' '}
          <strong>{username}</strong>.
        </li>
        <li>
          {uiText(
            locale,
            'Подключитесь к серверу и откройте ссылку из игрового чата.',
            'Connect to the server and open the link in the game chat.',
          )}
        </li>
        <li>
          {uiText(
            locale,
            'Проверьте запрос здесь и подтвердите вход.',
            'Review the request here and confirm your sign-in.',
          )}
        </li>
      </ol>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Если ссылка не открывается, оставьте эту страницу открытой: запрос появится автоматически, а код можно будет ввести вручную.',
          'If the link does not open, keep this page open. The request will appear automatically and you can enter the code manually.',
        )}
      </p>
    </section>
  );
}
export { MinecraftStart };
