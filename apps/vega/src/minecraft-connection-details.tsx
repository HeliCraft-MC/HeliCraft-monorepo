import type { ReactElement } from 'react';
import type { MinecraftConnectionDetails } from '@helicraft/alhena';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './minecraft.module.scss';

function MinecraftConnectionExtra({
  connection,
}: Readonly<{ connection: MinecraftConnectionDetails }>): ReactElement | null {
  const { text, locale } = useTranslation();
  if (connection === null) {
    return null;
  }
  return (
    <details className={styles.details}>
      <summary>{uiText(locale, 'Подробнее о подключении', 'More connection details')}</summary>
      <dl className={styles.connectionFacts}>
        <div>
          <dt>{text('minecraft.clientPort')}</dt>
          <dd>{connection.port}</dd>
        </div>
        <div>
          <dt>{text('minecraft.protocol')}</dt>
          <dd>{connection.protocol}</dd>
        </div>
        {connection.location?.timeZone !== undefined && connection.location.timeZone !== null ? (
          <div>
            <dt>{text('minecraft.timeZone')}</dt>
            <dd>{connection.location.timeZone}</dd>
          </div>
        ) : null}
      </dl>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Адрес может принадлежать VPN, прокси или локальной сети. Местоположение приблизительное, версия определяется протоколом клиента.',
          'The address may belong to a VPN, proxy or local network. Location is approximate; the version comes from the client protocol.',
        )}
      </p>
    </details>
  );
}
export { MinecraftConnectionExtra };
