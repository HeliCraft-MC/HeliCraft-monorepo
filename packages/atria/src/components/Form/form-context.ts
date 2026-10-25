import { createContext, useContext } from 'react';
import { createFormHookContexts } from '@tanstack/react-form';
import type { InputLanguage } from '../LocalizableTextInput/localizable-text-input';

interface FormTranslation {
  readonly language: string;
  readonly languages: readonly InputLanguage[];
}
const FormTranslationContext = createContext<FormTranslation | null>(null);
const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();
function useFormTranslation(): FormTranslation | null {
  return useContext(FormTranslationContext);
}
export {
  FormTranslationContext,
  useFormTranslation,
  fieldContext,
  formContext,
  useFieldContext,
  useFormContext,
};

export { useFormLanguage } from './use-form-language';
