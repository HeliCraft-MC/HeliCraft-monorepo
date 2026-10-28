import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { Check, ShieldX } from 'lucide-react';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import type { MinecraftDecision } from './minecraft-challenge-model';
import styles from './minecraft.module.scss';

function MinecraftResult({ decision }: Readonly<{ decision: MinecraftDecision }>): ReactElement {
  const { locale } = useTranslation();
  const approved = decision === 'APPROVE';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className={styles.result} data-approved={approved}>
      <span className={styles.resultIcon}>
        {approved ? <Check aria-hidden="true" /> : <ShieldX aria-hidden="true" />}
      </span>
      <h2 ref={heading} tabIndex={-1}>
        {approved
          ? uiText(locale, 'Вход подтверждён', 'Sign-in confirmed')
          : uiText(locale, 'Вход отклонён', 'Sign-in rejected')}
      </h2>
      <p>
        {approved
          ? uiText(
              locale,
              'Вернитесь в Minecraft. Игра подключит вас к серверу автоматически.',
              'Return to Minecraft. The game will connect you to the server automatically.',
            )
          : uiText(
              locale,
              'Этот запрос закрыт. Если захотите войти сами, подключитесь к серверу заново.',
              'This request is closed. To sign in yourself, reconnect to the server.',
            )}
      </p>
    </section>
  );
}
export { MinecraftResult };
