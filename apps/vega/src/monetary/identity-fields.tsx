import type { ReactElement } from 'react';
import type { LocalizedInput } from '@helicraft/alhena';
import { FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';

function IdentityFields({
  name,
  description,
  onName,
  onDescription,
  currency,
  id,
}: Readonly<{
  name: LocalizedInput;
  description: LocalizedInput;
  onName: (value: LocalizedInput) => void;
  onDescription: (value: LocalizedInput) => void;
  currency: boolean;
  id: string;
}>): ReactElement {
  const { text } = useTranslation();
  return (
    <>
      <LocalizedInputField label={text('monetary.name')} value={name} onChange={onName} />
      <LocalizedInputField
        label={text('monetary.description')}
        multiline
        value={description}
        onChange={onDescription}
      />
      {currency && (
        <FormField label={text('monetary.code')} htmlFor={`${id}-code`}>
          <TextField
            id={`${id}-code`}
            name="code"
            required
            pattern="[A-Z][A-Z0-9]{2,11}"
            maxLength={12}
            autoCapitalize="characters"
          />
        </FormField>
      )}
    </>
  );
}
export { IdentityFields };
