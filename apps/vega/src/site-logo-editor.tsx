import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadSiteLogo, resetSiteLogo } from '@helicraft/alhena';
import type { SiteSettings } from '@helicraft/alhena';
import { Alert, Button, FileDropzone } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import styles from './account.module.scss';

function SiteLogoEditor({
  settings,
  onSaved,
}: Readonly<{ settings: SiteSettings; onSaved: () => Promise<void> }>): ReactElement {
  const { locale } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const logo = useMutation({
    mutationFn: async (selected: File | null) => {
      await (selected === null
        ? resetSiteLogo({ client: browserClient(), throwOnError: true })
        : uploadSiteLogo({
            client: browserClient(),
            body: { file: selected },
            throwOnError: true,
          }));
      setFile(null);
      await onSaved();
    },
  });
  const { mutate } = logo;
  const upload = useCallback((): void => {
    if (file !== null) {
      mutate(file);
    }
  }, [file, mutate]);
  const reset = useCallback((): void => {
    mutate(null);
  }, [mutate]);
  return (
    <section className={styles.section}>
      <h2>{uiText(locale, 'Логотип сервера', 'Server logo')}</h2>
      <img
        src={settings.logoUrl ?? '/world/logo.png'}
        alt={uiText(locale, 'Текущий логотип', 'Current logo')}
        width="96"
        height="96"
      />
      <FileDropzone
        id="site-logo"
        label={uiText(locale, 'Новый логотип', 'New logo')}
        hint={uiText(
          locale,
          'PNG, JPEG или WebP до 2 МиБ, до 4 мегапикселей.',
          'PNG, JPEG or WebP up to 2 MiB and 4 megapixels.',
        )}
        accept="image/png,image/jpeg,image/webp"
        file={file}
        onChoose={setFile}
        disabled={logo.isPending}
      />
      <div className={styles.navigation}>
        <Button onClick={upload} disabled={file === null || logo.isPending}>
          {uiText(locale, 'Загрузить логотип', 'Upload logo')}
        </Button>
        <Button tone="quiet" onClick={reset} disabled={settings.logoUrl === null || logo.isPending}>
          {uiText(locale, 'Вернуть стандартный', 'Restore default')}
        </Button>
      </div>
      {logo.isSuccess && (
        <Alert tone="success">{uiText(locale, 'Логотип обновлён', 'Logo updated')}</Alert>
      )}
      {logo.error !== null && <Alert tone="danger">{errorMessage(logo.error)}</Alert>}
    </section>
  );
}
export { SiteLogoEditor };
