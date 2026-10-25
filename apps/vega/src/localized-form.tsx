import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { Form, FormModel } from '@helicraft/atria';
import type { LocalizedInput } from '@helicraft/alhena';
import { z } from 'zod';
import { formLanguages } from './form-languages';
import { useTranslation } from './i18n';
import { uiText } from './states/text';

type LocalizedValues = Record<string, LocalizedInput>;
interface LocalizedFormField {
  readonly name: string;
  readonly label: string;
  readonly value: LocalizedInput;
  readonly multiline?: boolean;
  readonly onChange: (value: LocalizedInput) => void;
}
function LocalizedForm({
  fields,
}: Readonly<{ fields: readonly LocalizedFormField[] }>): ReactElement {
  const { locale } = useTranslation();
  const model = useMemo(
    () =>
      new FormModel<LocalizedValues>({
        defaultValues: Object.fromEntries(fields.map((field) => [field.name, field.value])),
        schema: z.record(z.string(), z.record(z.string(), z.string().optional())),
        fields: fields.map((field) => ({
          name: field.name,
          kind: field.multiline === true ? 'localized-multiline' : 'localized',
          label: field.label,
        })),
      }),
    [fields],
  );
  const change = useCallback(
    (values: LocalizedValues): void => {
      for (const field of fields) {
        const value = values[field.name];
        if (value !== undefined && value !== field.value) {
          field.onChange(value);
        }
      }
    },
    [fields],
  );
  return (
    <Form
      embedded
      model={model}
      languages={formLanguages}
      defaultLanguage={locale}
      languageLabel={uiText(locale, 'Язык содержимого', 'Content language')}
      translationHint={uiText(
        locale,
        'Один язык для всех полей. Введённые переводы сохраняются независимо.',
        'One language for every field. Explicit translations are preserved independently.',
      )}
      onSubmit={change}
      onValuesChange={change}
    />
  );
}
export { LocalizedForm, type LocalizedFormField };
