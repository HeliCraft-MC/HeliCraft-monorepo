import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { FormField, TextField, Textarea } from '@helicraft/atria';
import { locales } from './locales';
import { useTranslation } from './i18n';
import styles from './account.module.scss';

type FieldValues = Readonly<
  Partial<
    Record<
      'title' | 'description' | 'markdown' | 'seoTitle' | 'seoDescription' | 'alt' | 'place',
      string | null | undefined
    >
  >
>;
type TranslatedFields = Readonly<Record<string, FieldValues>>;
const contentFields = ['title', 'description', 'markdown', 'seoTitle', 'seoDescription'] as const;
const galleryFields = ['title', 'alt', 'description', 'place'] as const;
const fieldLabels = {
  title: 'common.title',
  description: 'common.description',
  markdown: 'editor.markdown',
  seoTitle: 'editor.seoTitle',
  seoDescription: 'editor.seoDescription',
  alt: 'gallery.upload.alt',
  place: 'gallery.upload.place',
};
const GALLERY_DESCRIPTION_LIMIT = 2000;
const CONTENT_DESCRIPTION_LIMIT = 500;
const MARKDOWN_ROWS = 18;
const TEXT_ROWS = 3;
const limits = {
  title: 160,
  alt: 500,
  place: 160,
  markdown: 100_000,
  seoTitle: 160,
  seoDescription: 500,
};
function TranslationFields({
  kind,
  values,
  originalValues,
  originalLanguage,
  onChange,
}: Readonly<{
  kind: 'content' | 'gallery';
  values: TranslatedFields;
  originalValues: FieldValues;
  originalLanguage: string;
  onChange?: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
}>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const language = selected ?? originalLanguage;
  const fields = kind === 'content' ? contentFields : galleryFields;
  const languages = [
    ...new Set([originalLanguage, ...Object.keys(locales), ...Object.keys(values)]),
  ];
  const select = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (onChange) {
        onChange(event);
      } else {
        const { name, value } = event.currentTarget;
        setDrafts((previous) => ({ ...previous, [name]: value }));
      }
    },
    [onChange],
  );
  return (
    <section className={styles.form}>
      <FormField
        label={text('translations.editLanguage')}
        htmlFor={`${id}-language`}
        hint={text('translations.fallback')}
      >
        <select
          id={`${id}-language`}
          value={language}
          onChange={select}
          aria-describedby={`${id}-language-hint`}
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {Object.entries(locales).find(([key]) => key === code)?.[1].name ?? code}
              {code === originalLanguage ? ` · ${text('translations.originalLanguage')}` : ''}
            </option>
          ))}
        </select>
      </FormField>
      {languages.flatMap((code) =>
        fields.map((field) => {
          const original = code === originalLanguage;
          const name = original ? field : `translation:${code}:${field}`;
          const value =
            (onChange ? undefined : drafts[name]) ??
            (original ? originalValues[field] : values[code]?.[field]) ??
            '';
          if (code !== language) {
            return <input key={name} type="hidden" name={name} value={value} />;
          }
          const descriptionLimit =
            kind === 'gallery' ? GALLERY_DESCRIPTION_LIMIT : CONTENT_DESCRIPTION_LIMIT;
          const maxLength = field === 'description' ? descriptionLimit : limits[field];
          const required =
            original && (field === 'title' || field === 'alt' || field === 'markdown');
          return (
            <FormField
              key={name}
              htmlFor={`${id}-${name}`}
              label={text(fieldLabels[field])}
              hint={field === 'alt' ? text('gallery.upload.altHint') : undefined}
            >
              {field === 'markdown' || field === 'description' || field === 'seoDescription' ? (
                <Textarea
                  id={`${id}-${name}`}
                  name={name}
                  value={value}
                  onChange={change}
                  rows={field === 'markdown' ? MARKDOWN_ROWS : TEXT_ROWS}
                  maxLength={maxLength}
                  required={required}
                />
              ) : (
                <TextField
                  id={`${id}-${name}`}
                  name={name}
                  value={value}
                  onChange={change}
                  maxLength={maxLength}
                  required={required}
                />
              )}
            </FormField>
          );
        }),
      )}
    </section>
  );
}
export { TranslationFields };

export { OriginalLanguage } from './original-language';
