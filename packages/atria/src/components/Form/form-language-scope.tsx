import type { ReactElement, ReactNode } from 'react';
import type { InputLanguage } from '../LocalizableTextInput/localizable-text-input';
import { FormTranslationContext, useFormLanguage } from './form-context';
import { FormLanguageSwitch } from './form-language-switch';
import styles from './form.module.scss';

function FormLanguageScope({
  languages,
  defaultLanguage,
  label,
  hint,
  children,
}: Readonly<{
  languages: readonly InputLanguage[];
  defaultLanguage: string;
  label: string;
  hint: string;
  children: ReactNode;
}>): ReactElement {
  const { context, changeLanguage } = useFormLanguage(languages, defaultLanguage);
  return (
    <FormTranslationContext value={context}>
      <div className={styles.form}>
        <FormLanguageSwitch
          languages={languages}
          value={context.language}
          label={label}
          hint={hint}
          onChange={changeLanguage}
        />
        {children}
      </div>
    </FormTranslationContext>
  );
}
export { FormLanguageScope };
