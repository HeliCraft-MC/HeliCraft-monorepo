import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocalizableTextInput } from './localizable-text-input';

const languages = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
];
function Editor(): ReactElement {
  const [value, setValue] = useState<Partial<Record<string, string>>>({
    en: 'A new beginning',
    ru: 'Новое начало',
  });
  return (
    <LocalizableTextInput
      label="Title"
      value={value}
      onChange={setValue}
      languages={languages}
      defaultLanguage="en"
      languageLabel="Translation language"
      progressLabel="Translations completed"
    />
  );
}
const meta = {
  title: 'Components/LocalizableTextInput',
  component: LocalizableTextInput,
  tags: ['autodocs'],
  args: {
    label: 'Title',
    value: {},
    onChange: (value): void => {
      void value;
    },
    languages,
    defaultLanguage: 'en',
    languageLabel: 'Translation language',
    progressLabel: 'Translations completed',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Controlled multilingual text field with a native language picker that scales to many languages and works on mobile. Switching languages preserves all values; completion marks represent explicit translations only. Supply supported languages and localized interface labels. Fallback belongs to the platform resolver, never this editor.',
      },
    },
  },
} satisfies Meta<typeof LocalizableTextInput>;
const ManyLanguages: StoryObj<typeof meta> = { render: Editor };
export { ManyLanguages };
export default meta;
