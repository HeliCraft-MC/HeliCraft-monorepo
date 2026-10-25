import type { ReactElement, ReactNode } from 'react';
import { FormLanguageScope } from '@helicraft/atria';
import { formLanguages } from './form-languages';
import { useTranslation } from './i18n';
import { uiText } from './states/text';

function ContentLanguageScope({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <FormLanguageScope
      languages={formLanguages}
      defaultLanguage={locale}
      label={uiText(locale, 'Язык содержимого', 'Content language')}
      hint={uiText(
        locale,
        'Язык переключается для всех вложенных полей. Пустые переводы остаются пустыми.',
        'The language applies to every nested field. Empty translations stay empty.',
      )}
    >
      {children}
    </FormLanguageScope>
  );
}
export { ContentLanguageScope };
