import { useMemo, useState, useCallback } from 'react';
import type { ChangeEvent, ComponentProps, ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listGallery, uploadGalleryImage } from '@helicraft/alhena';
import type { SurveyBlock } from '@helicraft/alhena';
import { Alert, Button, FileDropzone, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import styles from './survey.module.scss';

const MAX_IMAGES = 10;
const PAGE_SIZE = 12;
function SurveyImagePicker({
  block,
  onChange,
}: Readonly<{ block: SurveyBlock; onChange: (block: SurveyBlock) => void }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const gallery = useQuery({
    queryKey: ['survey-gallery', page],
    queryFn: async () => {
      const result = await listGallery({
        client: browserClient(),
        query: { page, pageSize: PAGE_SIZE },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const result = await uploadGalleryImage({
        client: browserClient(),
        body: { file, metadata: JSON.stringify({ title, alt: title, originalLanguage: locale }) },
        throwOnError: true,
      });
      onChange({
        ...block,
        images: [...block.images, { id: result.data.id, caption: { [locale]: title } }],
      });
    },
  });
  const scope = useMemo(() => [block, onChange, page], [block, onChange, page]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const localized =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(scope);
  const setImageTitle = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTitle(event.currentTarget.value);
  }, []);
  const { mutate } = upload;
  const choose = useCallback(
    (file: File | null): void => {
      if (file) {
        mutate(file);
      }
    },
    [mutate],
  );
  return (
    <div className={styles.editor}>
      <p>
        {uiText(
          locale,
          'Выберите снимки из галереи или загрузите новый. Новый снимок также появится в публичной галерее.',
          'Choose gallery images or upload a new one. New images also appear in the public gallery.',
        )}
      </p>
      {block.images.map((image) => (
        <div key={image.id}>
          <img
            className={styles.thumbnail}
            src={`/api/v1/public/gallery/${image.id}/thumbnail`}
            alt={displayText(image.caption, locale)}
          />
          <LocalizedInputField
            label={uiText(locale, 'Подпись изображения', 'Image caption')}
            value={image.caption}
            onChange={localized(image.id, (caption) => {
              onChange({
                ...block,
                images: block.images.map((item) =>
                  item.id === image.id ? { ...item, caption } : item,
                ),
              });
            })}
          />
          <Button
            tone="quiet"
            onClick={click(`remove:${image.id}`, () => {
              onChange({ ...block, images: block.images.filter((item) => item.id !== image.id) });
            })}
          >
            {uiText(locale, 'Удалить изображение', 'Remove image')}
          </Button>
        </div>
      ))}
      <div className={styles.imageGrid}>
        {(gallery.data?.items ?? []).map((image) => (
          <Button
            key={image.id}
            tone="quiet"
            disabled={
              block.images.length >= MAX_IMAGES || block.images.some((item) => item.id === image.id)
            }
            onClick={click(image.id, () => {
              onChange({
                ...block,
                images: [...block.images, { id: image.id, caption: { [locale]: image.alt } }],
              });
            })}
          >
            <img className={styles.thumbnail} src={image.thumbnailUrl} alt={image.alt} />
            {image.title}
          </Button>
        ))}
      </div>
      <div className={styles.toolbar}>
        <Button
          tone="quiet"
          disabled={page === 1}
          onClick={click('prev', () => {
            setPage(page - 1);
          })}
        >
          {uiText(locale, 'Назад', 'Previous')}
        </Button>
        <Button
          tone="quiet"
          disabled={page * PAGE_SIZE >= (gallery.data?.total ?? 0)}
          onClick={click('next', () => {
            setPage(page + 1);
          })}
        >
          {uiText(locale, 'Далее', 'Next')}
        </Button>
      </div>
      <FormField
        htmlFor={`${block.id}-upload-title`}
        label={uiText(locale, 'Название нового снимка', 'New image title')}
      >
        <TextField id={`${block.id}-upload-title`} value={title} onChange={setImageTitle} />
      </FormField>
      <FileDropzone
        id={`${block.id}-upload`}
        label={uiText(locale, 'Загрузить изображение', 'Upload image')}
        hint={uiText(locale, 'PNG, JPEG, WebP, до 10 МБ', 'PNG, JPEG, WebP, up to 10 MB')}
        accept="image/png,image/jpeg,image/webp"
        file={null}
        disabled={
          upload.isPending || title.trim().length === 0 || block.images.length >= MAX_IMAGES
        }
        onChoose={choose}
      />
      {upload.isError && <Alert tone="danger">{errorMessage(upload.error)}</Alert>}
      {gallery.isError && <Alert tone="danger">{errorMessage(gallery.error)}</Alert>}
    </div>
  );
}
export { SurveyImagePicker };
