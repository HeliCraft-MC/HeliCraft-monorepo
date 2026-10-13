// oxlint-disable react/no-multi-comp -- Compact controls and the fullscreen dialog share the same document-language contract.
import type { ChangeEvent, ReactElement } from 'react';
import { Alert, Button, Dialog, FormField, Select } from '@helicraft/atria';
import type { Locale } from '../locales';
import { uiText } from './text';
import { ConstitutionPreview } from './constitution-preview';
import type { useConstitutionPreview } from './use-constitution-preview';
import styles from './constitution-editor.module.scss';

interface LanguageControl {
  readonly id: string;
  readonly locale: Locale;
  readonly language: Locale;
  readonly onLanguage: (event: ChangeEvent<HTMLSelectElement>) => void;
}
function ConstitutionActions({
  id,
  locale,
  language,
  onLanguage,
  empty,
  onTemplate,
  onPreview,
}: LanguageControl &
  Readonly<{ empty: boolean; onTemplate: () => void; onPreview: () => void }>): ReactElement {
  return (
    <div className={styles.actions}>
      <FormField
        htmlFor={`${id}-language`}
        label={uiText(locale, 'Язык документа', 'Document language')}
      >
        <Select id={`${id}-language`} value={language} onChange={onLanguage}>
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </Select>
      </FormField>
      <Button tone="quiet" onClick={onTemplate} disabled={!empty}>
        {uiText(locale, 'Начать с шаблона', 'Start from a template')}
      </Button>
      <Button tone="quiet" onClick={onPreview}>
        {uiText(locale, 'Предпросмотр', 'Preview')}
      </Button>
    </div>
  );
}
function ConstitutionPreviewDialog({
  id,
  locale,
  language,
  onLanguage,
  open,
  onOpen,
  preview,
}: LanguageControl &
  Readonly<{
    open: boolean;
    onOpen: (open: boolean) => void;
    preview: ReturnType<typeof useConstitutionPreview>;
  }>): ReactElement {
  return (
    <Dialog
      size="fullscreen"
      open={open}
      onOpenChange={onOpen}
      title={uiText(locale, 'Предпросмотр Конституции', 'Constitution preview')}
      closeLabel={uiText(locale, 'Закрыть', 'Close')}
    >
      <div className={styles.fullscreen}>
        <FormField
          htmlFor={`${id}-preview-language`}
          label={uiText(locale, 'Язык документа', 'Document language')}
        >
          <Select id={`${id}-preview-language`} value={language} onChange={onLanguage}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </Select>
        </FormField>
        <ConstitutionPreview preview={preview} locale={language} />
      </div>
    </Dialog>
  );
}
function ConstitutionNotice({ locale }: Readonly<{ locale: Locale }>): ReactElement {
  return (
    <Alert>
      {uiText(
        locale,
        'Пишите Конституцию как обычный документ. Абзацы, списки и отступы сохраняются в Markdown. Подстановки берут данные из этой редакции; свободный текст не изменяет системные полномочия.',
        'Write your constitution as a document. Paragraphs, lists and indentation are saved as Markdown. Placeholders use this revision’s data; free text does not change system authority.',
      )}
    </Alert>
  );
}
export { ConstitutionActions, ConstitutionPreviewDialog, ConstitutionNotice };
