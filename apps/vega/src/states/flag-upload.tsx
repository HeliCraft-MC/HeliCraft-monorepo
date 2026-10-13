import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { uploadStateFlag } from '@helicraft/alhena';
import { Alert, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './banner-editor.module.scss';

function FlagUpload({
  mediaId,
  onUploaded,
}: Readonly<{ mediaId: string | null; onUploaded: (id: string) => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [failure, setFailure] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.currentTarget.files?.[0];
      if (!file) {
        return;
      }
      setUploading(true);
      setFailure(null);
      try {
        const { data } = await uploadStateFlag({
          client: browserClient(),
          body: { file },
          throwOnError: true,
        });
        onUploaded(data.id);
      } catch (error) {
        setFailure(errorMessage(error));
      }
      setUploading(false);
    },
    [onUploaded],
  );
  const handleUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      void upload(event);
    },
    [upload],
  );
  return (
    <div className={styles.upload}>
      <FormField
        htmlFor={id}
        label={uiText(
          locale,
          'PNG до 2 МБ, не более 4096×4096',
          'PNG up to 2 MB, at most 4096×4096',
        )}
      >
        <TextField
          id={id}
          type="file"
          accept="image/png"
          disabled={uploading}
          onChange={handleUpload}
        />
      </FormField>
      {uploading && <output>{uiText(locale, 'Загрузка…', 'Uploading…')}</output>}
      {mediaId !== null && (
        <img alt={uiText(locale, 'Флаг', 'Flag')} src={`/api/v1/account/state-flags/${mediaId}`} />
      )}
      {failure !== null && <Alert tone="danger">{failure}</Alert>}
    </div>
  );
}
export { FlagUpload };
