import type { ChangeEvent, ReactElement } from 'react';
import { Select } from '../Select/select';
import { Textarea } from '../Textarea/textarea';
import { TextField } from '../TextField/text-field';

interface FormControlInputProps {
  readonly id: string;
  readonly name: string;
  readonly kind: 'text' | 'textarea' | 'localized' | 'localized-multiline' | 'select';
  readonly value: string;
  readonly label: string;
  readonly language?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly error: boolean;
  readonly describedBy?: string;
  readonly onBlur: () => void;
  readonly onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
}
// oxlint-disable-next-line max-lines-per-function -- The three native field variants keep their explicit accessible bindings together.
function FormControlInput({
  id,
  name,
  kind,
  value,
  label,
  language,
  required,
  maxLength,
  error,
  describedBy,
  onBlur,
  onChange,
  options,
}: FormControlInputProps): ReactElement {
  const common = {
    id,
    name,
    value,
    onChange,
    onBlur,
    required,
    'aria-invalid': error || undefined,
    'aria-describedby': describedBy,
  };
  if (kind === 'select') {
    return (
      <Select {...common}>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  if (kind === 'textarea' || kind === 'localized-multiline') {
    return (
      <Textarea {...common} lang={language} aria-label={label} maxLength={maxLength} rows={4} />
    );
  }
  return (
    <TextField
      {...common}
      lang={language}
      aria-label={label}
      maxLength={maxLength}
      invalid={error}
    />
  );
}
export { FormControlInput };
