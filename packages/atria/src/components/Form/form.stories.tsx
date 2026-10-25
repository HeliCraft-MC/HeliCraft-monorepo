import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './form';
import { FormModel } from './form-model';
import { FormSection } from './form-section';

interface CompanyFields {
  name: Partial<Record<string, string>>;
  description: Partial<Record<string, string>>;
}
const languages = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];
class CompanyForm extends FormModel<CompanyFields> {
  public constructor() {
    super({
      defaultValues: { name: { en: 'Aurora' }, description: {} },
      schema: {
        '~standard': {
          version: 1,
          vendor: 'example',
          validate(value) {
            if (
              typeof value !== 'object' ||
              value === null ||
              !('name' in value) ||
              typeof value.name !== 'object' ||
              value.name === null ||
              !Object.values(value.name).some(
                (text: unknown) => typeof text === 'string' && text.trim() !== '',
              )
            ) {
              return {
                issues: [{ path: ['name'], message: 'Enter a name in at least one language.' }],
              };
            }
            return { value };
          },
        },
      },
      fields: [
        { kind: 'localized', name: 'name', label: 'Company name' },
        { kind: 'localized-multiline', name: 'description', label: 'Description' },
      ],
    });
  }
}
const model = new CompanyForm();
function Example(): ReactElement {
  const [saved, setSaved] = useState<CompanyFields | null>(null);
  return (
    <FormSection
      title="Company profile"
      description="Switch the content language once for the entire form. Explicit translations are preserved independently."
    >
      <Form
        model={model}
        onSubmit={setSaved}
        languages={languages}
        defaultLanguage="en"
        languageLabel="Content language"
        translationHint="Blank translations stay blank. Validation applies to the complete model."
        submitLabel="Review profile"
      />
      {saved !== null && <output>{JSON.stringify(saved)}</output>}
    </FormSection>
  );
}
const meta = {
  title: 'Forms/Form',
  component: Example,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Schema-driven form composition backed by TanStack Form. Pass a FormModel instance (or a subclass) containing default values, a Standard Schema validator such as Zod, and typed field descriptors. Form creates and manages the library instance automatically. A single content-language control governs generated and nested LocalizableTextInput fields without copying fallbacks. For arrays, uploads, conditional sections or autosave, use useFormModel and pass the resulting instance to Form; custom controls remain ordinary components. FormSection groups related controls. Validators check the original typed values; schema output transformations are not applied. Pass localized labels and validation messages from the product.',
      },
    },
  },
} satisfies Meta<typeof Example>;
const Default: StoryObj<typeof meta> = {};
const Narrow: StoryObj<typeof meta> = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
export { Default, Narrow };
export default meta;
