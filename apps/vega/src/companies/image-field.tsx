import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadCompanyMedia } from '@helicraft/alhena';
import { Alert, Button, FileDropzone } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './companies.module.scss';

function CompanyImageField({
  companyId,
  kind,
  mediaId,
  onChange,
}: Readonly<{
  companyId: string;
  kind: 'LOGO' | 'COVER';
  mediaId: string | null;
  onChange: (id: string | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const result = await uploadCompanyMedia({
        client: browserClient(),
        path: { id: companyId },
        query: { kind },
        body: { file },
        throwOnError: true,
      });
      return result.data.id;
    },
    onSuccess: onChange,
  });
  const { mutate } = upload;
  const choose = useCallback(
    (file: File | null): void => {
      if (file !== null) {
        mutate(file);
      }
    },
    [mutate],
  );
  const remove = useCallback((): void => {
    onChange(null);
  }, [onChange]);
  const label =
    kind === 'LOGO'
      ? uiText(locale, 'Логотип · 1:1', 'Logo · 1:1')
      : uiText(locale, 'Обложка страницы', 'Page cover');
  return (
    <div className={styles.imageField}>
      {mediaId !== null && (
        <img
          className={kind === 'LOGO' ? styles.logo : styles.cover}
          src={`/api/v1/account/companies/${companyId}/media/${mediaId}`}
          alt={label}
        />
      )}
      <FileDropzone
        id={`company-${companyId}-${kind}`}
        label={label}
        hint={
          kind === 'LOGO'
            ? uiText(
                locale,
                'PNG, JPEG, WebP до 10 МБ. Обрезка по центру до квадрата.',
                'PNG, JPEG, WebP up to 10 MB. Cropped to a square from the center.',
              )
            : uiText(
                locale,
                'Горизонтальный PNG, JPEG или WebP до 10 МБ.',
                'A horizontal PNG, JPEG or WebP up to 10 MB.',
              )
        }
        accept="image/png,image/jpeg,image/webp"
        file={null}
        onChoose={choose}
        disabled={upload.isPending}
      />
      {upload.isPending && (
        <output>{uiText(locale, 'Загрузка изображения…', 'Uploading image…')}</output>
      )}
      {mediaId !== null && (
        <Button tone="quiet" onClick={remove} disabled={upload.isPending}>
          {uiText(locale, 'Убрать изображение', 'Remove image')}
        </Button>
      )}
      {upload.error !== null && <Alert tone="danger">{errorMessage(upload.error)}</Alert>}
    </div>
  );
}
export { CompanyImageField };
