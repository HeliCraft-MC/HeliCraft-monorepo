import { SiteLogoEditor } from './site-logo-editor';
import { useCallback } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { updateSiteSettings } from '@helicraft/alhena';
import type { SiteSettings } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './account.module.scss';

function SettingsEditor({ settings }: Readonly<{ settings: SiteSettings }>): ReactElement {
  const { locale } = useTranslation();
  const queries = useQueryClient();
  const router = useRouter();
  const refresh = useCallback(async (): Promise<void> => {
    await queries.invalidateQueries({ queryKey: ['site-settings'] });
    await router.invalidate();
  }, [queries, router]);
  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const value = (key: string): string => {
        const entry = form.get(key);
        return typeof entry === 'string' ? entry : '';
      };
      await updateSiteSettings({
        client: browserClient(),
        body: {
          serverName: value('serverName'),
          minecraftAddress: value('minecraftAddress'),
          githubUrl: value('githubUrl'),
        },
        throwOnError: true,
      });
      await refresh();
    },
  });
  const { mutate: saveSettings } = save;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      saveSettings(new FormData(event.currentTarget));
    },
    [saveSettings],
  );
  return (
    <>
      <form className={styles.form} onSubmit={submit}>
        <FormField label={uiText(locale, 'Название сервера', 'Server name')} htmlFor="site-name">
          <TextField
            id="site-name"
            name="serverName"
            defaultValue={settings.serverName}
            required
            maxLength={80}
          />
        </FormField>
        <FormField
          label={uiText(locale, 'Адрес сервера Minecraft', 'Minecraft server address')}
          htmlFor="site-address"
          hint={uiText(
            locale,
            'IP или домен, при необходимости с портом. Публикуется после открытия сервера.',
            'IP or hostname, optionally with a port. Published when the server opens.',
          )}
        >
          <TextField
            id="site-address"
            name="minecraftAddress"
            defaultValue={settings.minecraftAddress}
            maxLength={253}
          />
        </FormField>
        <FormField
          label="GitHub"
          htmlFor="site-github"
          hint={uiText(
            locale,
            'HTTPS-ссылка на github.com. Оставьте пустым, чтобы скрыть.',
            'HTTPS github.com link. Leave empty to hide.',
          )}
        >
          <TextField
            id="site-github"
            name="githubUrl"
            type="url"
            defaultValue={settings.githubUrl}
            maxLength={2048}
          />
        </FormField>
        <Button type="submit" disabled={save.isPending}>
          {uiText(locale, 'Сохранить настройки', 'Save settings')}
        </Button>
        {save.isSuccess && (
          <Alert tone="success">{uiText(locale, 'Настройки сохранены', 'Settings saved')}</Alert>
        )}
        {save.error !== null && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
      </form>
      <SiteLogoEditor settings={settings} onSaved={refresh} />
    </>
  );
}

export { SettingsEditor };
