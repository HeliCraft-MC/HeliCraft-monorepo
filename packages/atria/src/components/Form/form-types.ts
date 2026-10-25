import type { ReactNode } from 'react';
import type { InputLanguage } from '../LocalizableTextInput/localizable-text-input';
import type { FormInstance } from './use-form-model';
import type { FormModel } from './form-model';

interface FormViewProps<TValues> {
  readonly form: FormInstance<TValues>;
  readonly model: FormModel<TValues>;
  readonly languages: readonly InputLanguage[];
  readonly defaultLanguage: string;
  readonly languageLabel: string;
  readonly translationHint: string;
  readonly className?: string;
  readonly autoFields?: boolean;
  readonly embedded?: boolean;
  readonly languageSelectorVisible?: boolean;
  readonly submitLabel?: string;
  readonly submittingLabel?: string;
  readonly submitErrorLabel?: string;
  readonly children?: ReactNode;
}
export { type FormViewProps };
