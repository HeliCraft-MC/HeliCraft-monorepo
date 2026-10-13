import { useCallback, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { StateConfiguration, LocalizedInput } from '@helicraft/alhena';
import type { Locale } from '../locales';
import {
  updateDocumentMarkdown,
  CONSTITUTION_TEMPLATE,
  CONSTITUTION_TEMPLATE_EN,
} from './constitution-markdown';

type Document = StateConfiguration['constitution'];
interface ConstitutionEditing {
  readonly document: Document;
  readonly language: Locale;
  readonly previewLanguage: Locale;
  readonly fullscreen: boolean;
  readonly setFullscreen: (open: boolean) => void;
  readonly changeFormal: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly changeLanguage: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly changePreviewLanguage: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly changeTitle: (title: LocalizedInput) => void;
  readonly changeText: (value: string) => void;
  readonly addTemplate: () => void;
  readonly openPreview: () => void;
}
// oxlint-disable-next-line max-lines-per-function -- Independent editing/preview languages and document restoration are coordinated in one typed editing hook.
function useConstitutionEditing(
  configuration: StateConfiguration,
  onChange: (document: Document) => void,
  locale: Locale,
): ConstitutionEditing {
  const [language, setLanguage] = useState<Locale>(locale);
  const [previewLanguage, setPreviewLanguage] = useState<Locale>(locale);
  const [fullscreen, setFullscreen] = useState(false);
  const [disabledDocument, setDisabledDocument] = useState(configuration.constitution);
  const document = configuration.constitution;
  const changeFormal = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      if (document !== null) {
        setDisabledDocument(document);
      }
      onChange(
        event.currentTarget.value === 'YES'
          ? (disabledDocument ?? { title: {}, blocks: [] })
          : null,
      );
    },
    [disabledDocument, document, onChange],
  );
  const changeTitle = useCallback(
    (title: LocalizedInput): void => {
      onChange(document === null ? null : { ...document, title });
    },
    [document, onChange],
  );
  const changeText = useCallback(
    (value: string): void => {
      if (document) {
        onChange(updateDocumentMarkdown(document, language, value));
      }
    },
    [document, language, onChange],
  );
  const changeLanguage = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    if (event.currentTarget.value === 'ru' || event.currentTarget.value === 'en') {
      setLanguage(event.currentTarget.value);
    }
  }, []);
  const changePreviewLanguage = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    if (event.currentTarget.value === 'ru' || event.currentTarget.value === 'en') {
      setPreviewLanguage(event.currentTarget.value);
    }
  }, []);
  const addTemplate = useCallback((): void => {
    if (document) {
      onChange(
        updateDocumentMarkdown(
          document,
          language,
          language === 'ru' ? CONSTITUTION_TEMPLATE : CONSTITUTION_TEMPLATE_EN,
        ),
      );
    }
  }, [document, language, onChange]);
  const openPreview = useCallback((): void => {
    setPreviewLanguage(language);
    setFullscreen(true);
  }, [language]);
  return {
    document,
    language,
    previewLanguage,
    fullscreen,
    setFullscreen,
    changeFormal,
    changeTitle,
    changeText,
    changeLanguage,
    changePreviewLanguage,
    addTemplate,
    openPreview,
  };
}
export { useConstitutionEditing };
