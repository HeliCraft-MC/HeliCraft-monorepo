import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { FormField } from '../FormField/form-field';
import { FormControlInput } from './form-control-input';
import { useFieldContext, useFormTranslation } from './form-context';
import { formErrorMessages } from './form-errors';
import { isFormText, formTextValue } from './form-values';

interface FormControlProps {
  readonly kind: 'text' | 'textarea' | 'localized' | 'localized-multiline' | 'select';
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
}
function FormControl(props: FormControlProps): ReactElement {
  const { kind, label, hint } = props;
  const field = useFieldContext<unknown>();
  const translation = useFormTranslation();
  const id = useId();
  const localized = kind === 'localized' || kind === 'localized-multiline';
  const language = translation?.language ?? '';
  const value = formTextValue(field.state.value, localized, language);
  const languageName = translation?.languages.find((item) => item.code === language)?.label;
  const accessibleLabel = localized ? `${label} · ${languageName ?? language}` : label;
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
      const next = event.currentTarget.value;
      field.handleChange(
        localized && isFormText(field.state.value)
          ? { ...field.state.value, [language]: next }
          : next,
      );
    },
    [field, localized, language],
  );
  const error = formErrorMessages(field.state.meta.errors).filter(Boolean).join(' · ');
  const describedBy =
    [hint === undefined ? '' : `${id}-hint`, error === '' ? '' : `${id}-error`]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <FormField htmlFor={id} label={label} hint={hint} error={error}>
      <FormControlInput
        {...props}
        id={id}
        name={field.name}
        label={accessibleLabel}
        value={value}
        language={localized ? language : undefined}
        onChange={change}
        onBlur={field.handleBlur}
        error={error !== ''}
        describedBy={describedBy}
      />
    </FormField>
  );
}
export { FormControl };
