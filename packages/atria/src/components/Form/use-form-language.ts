import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { InputLanguage } from '../LocalizableTextInput/localizable-text-input';

interface FormLanguageState {
  readonly context: { readonly language: string; readonly languages: readonly InputLanguage[] };
  readonly changeLanguage: (event: ChangeEvent<HTMLSelectElement>) => void;
}
function useFormLanguage(
  languages: readonly InputLanguage[],
  defaultLanguage: string,
): FormLanguageState {
  const [selected, setSelected] = useState(defaultLanguage);
  const language = languages.some((item) => item.code === selected)
    ? selected
    : (languages[0]?.code ?? defaultLanguage);
  const context = useMemo(() => ({ language, languages }), [language, languages]);
  const changeLanguage = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  return { context, changeLanguage };
}
export { useFormLanguage };
