import type { ReactElement } from 'react';
import type { MinecraftConnectionDetails } from '@helicraft/alhena';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './minecraft.module.scss';

function MinecraftConnection({
  connection,
}: Readonly<{ connection: MinecraftConnectionDetails | null }>): ReactElement {
  const { text, locale } = useTranslation();
  if (connection === null) {
    return <p>{text('minecraft.connectionUnknown')}</p>;
  }
  const { location } = connection;
  const country =
    location?.countryCode !== undefined && location.countryCode !== null
      ? new Intl.DisplayNames([locale], { type: 'region' }).of(location.countryCode)
      : undefined;
  const city = location?.city[locale] ?? location?.city.en ?? location?.city.ru;
  const place = [city, country].filter(Boolean).join(', ');
  return (
    <div className={styles.connection}>
      <dl className={styles.connectionFacts}>
        <div>
          <dt>{text('minecraft.ipAddress')}</dt>
          <dd>
            <code>{connection.address}</code>
          </dd>
        </div>
        <div>
          <dt>{text('minecraft.clientVersion')}</dt>
          <dd>{connection.version}</dd>
        </div>
        <div>
          <dt>{text('minecraft.location')}</dt>
          <dd>
            {connection.addressKind === 'LOCAL'
              ? uiText(locale, 'Локальная сеть или прокси', 'Local network or proxy')
              : place || uiText(locale, 'Не определено', 'Unavailable')}
          </dd>
        </div>
      </dl>
    </div>
  );
}
export { MinecraftConnection };
