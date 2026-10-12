import { OriginalLanguage } from './original-language';
import { useTranslation } from './i18n';
import type { ReactElement } from 'react';
import { FormField, TextField, Select, Checkbox } from '@helicraft/atria';
import type { EditorModel } from './use-content-editor';
import { categories, categoryKeys } from './editor-input';

function ContentEditorFields({
  model,
  pages,
}: Readonly<{ model: EditorModel; pages: boolean }>): ReactElement {
  const { text } = useTranslation();

  const { input, change: handleChange } = model;
  return (
    <>
      <OriginalLanguage value={input.originalLanguage ?? 'ru'} onChange={handleChange} />
      <FormField label={text('editor.slug')} htmlFor="content-slug" hint={text('editor.slugHint')}>
        <TextField
          id="content-slug"
          name="slug"
          value={input.slug}
          onChange={handleChange}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          aria-describedby="content-slug-hint"
        />
      </FormField>
      {pages ? null : (
        <>
          <FormField label={text('editor.category')} htmlFor="content-category">
            <Select
              id="content-category"
              name="category"
              value={input.category}
              onChange={handleChange}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {text(categoryKeys[category])}
                </option>
              ))}
            </Select>
          </FormField>
          <Checkbox
            label={text('editor.featured')}
            name="isFeatured"
            checked={input.isFeatured}
            onChange={handleChange}
          />
        </>
      )}
    </>
  );
}
export { ContentEditorFields };
