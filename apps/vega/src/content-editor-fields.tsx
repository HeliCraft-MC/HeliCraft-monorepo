import type { ReactElement } from 'react';
import { FormField, TextField, Textarea, Select, Checkbox } from '@helicraft/atria';
import type { EditorModel } from './use-content-editor';
import { categories } from './editor-input';

function ContentEditorFields({
  model,
  pages,
}: Readonly<{ model: EditorModel; pages: boolean }>): ReactElement {
  const { input, change } = model;
  return (
    <>
      <FormField label="Название" htmlFor="content-title">
        <TextField
          id="content-title"
          name="title"
          value={input.title}
          onChange={change}
          required
          maxLength={160}
        />
      </FormField>
      <FormField
        label="Адрес страницы"
        htmlFor="content-slug"
        hint="Латинские строчные буквы, цифры и дефисы"
      >
        <TextField
          id="content-slug"
          name="slug"
          value={input.slug}
          onChange={change}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          aria-describedby="content-slug-hint"
        />
      </FormField>
      <FormField label="Краткое описание" htmlFor="content-description">
        <Textarea
          id="content-description"
          name="description"
          value={input.description}
          onChange={change}
          maxLength={500}
        />
      </FormField>
      {pages ? null : (
        <>
          <FormField label="Категория" htmlFor="content-category">
            <Select id="content-category" name="category" value={input.category} onChange={change}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </Select>
          </FormField>
          <Checkbox
            label="Главная история"
            name="isFeatured"
            checked={input.isFeatured}
            onChange={change}
          />
        </>
      )}
      <FormField label="Markdown" htmlFor="content-markdown">
        <Textarea
          id="content-markdown"
          name="markdown"
          value={input.markdown}
          onChange={change}
          rows={18}
          maxLength={100_000}
        />
      </FormField>
      <FormField label="SEO title" htmlFor="seo-title">
        <TextField
          id="seo-title"
          name="seoTitle"
          value={input.seoTitle ?? ''}
          onChange={change}
          maxLength={160}
        />
      </FormField>
      <FormField label="SEO description" htmlFor="seo-description">
        <Textarea
          id="seo-description"
          name="seoDescription"
          value={input.seoDescription ?? ''}
          onChange={change}
          maxLength={500}
        />
      </FormField>
    </>
  );
}
export { ContentEditorFields };
