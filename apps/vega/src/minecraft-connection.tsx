import type { ReactElement } from 'react';
import type { MinecraftConnectionDetails } from '@helicraft/alhena';
import { useTranslation } from './i18n';

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
    <dl>
      <dt>{text('minecraft.ipAddress')}</dt>
      <dd>
        <code>{connection.address}</code>
      </dd>
      <dt>{text('minecraft.clientPort')}</dt>
      <dd>{connection.port}</dd>
      <dt>{text('minecraft.clientVersion')}</dt>
      <dd>
        {connection.version} ({text('minecraft.protocol')} {connection.protocol})
      </dd>
      <dt>{text('minecraft.location')}</dt>
      <dd>
        {connection.addressKind === 'LOCAL'
          ? text('minecraft.localAddress')
          : place || text('minecraft.locationUnknown')}
      </dd>
      {location?.timeZone !== undefined && location.timeZone !== null ? (
        <>
          <dt>{text('minecraft.timeZone')}</dt>
          <dd>{location.timeZone}</dd>
        </>
      ) : null}
    </dl>
  );
}
export { MinecraftConnection };
