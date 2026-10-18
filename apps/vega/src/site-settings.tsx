import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSiteSettings } from '@helicraft/alhena';
import { Alert, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import { SettingsEditor } from './site-settings-editor';

function SiteSettingsPage(): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const result = await getSiteSettings({ client: browserClient(), throwOnError: true });
      return result.data;
    },
  });
  return (
    <>
      <h1>{uiText(locale, 'Настройки сервера', 'Server settings')}</h1>
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка настроек…', 'Loading settings…')} />
      )}
      {query.data !== undefined && <SettingsEditor settings={query.data} />}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </>
  );
}
export { SiteSettingsPage };
