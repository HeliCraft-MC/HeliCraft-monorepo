// oxlint-disable import/max-dependencies -- The document editor composes localization, Markdown, safe preview and shared controls.
import { useId, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { StateConfiguration, StateDetail } from '@helicraft/alhena';
import { FormField, MarkdownEditor, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { LocalizedInputField } from './localized-input';
import { useConstitutionEditing } from './use-constitution-editing';
import { uiText } from './text';
import { documentMarkdown, constitutionSnippets, markdownLabels } from './constitution-markdown';
import { useConstitutionPreview } from './use-constitution-preview';
import {
  ConstitutionNotice,
  ConstitutionActions,
  ConstitutionPreviewDialog,
} from './constitution-editor-controls';
import { ConstitutionPreview } from './constitution-preview';
import styles from './constitution-editor.module.scss';

function ConstitutionEditor({
  configuration,
  onChange,
}: Readonly<{
  configuration: StateConfiguration;
  onChange: (value: StateConfiguration['constitution']) => void;
  founders?: StateDetail['founders'];
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const editing = useConstitutionEditing(configuration, onChange, locale);
  const {
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
  } = editing;
  const preview = useConstitutionPreview(configuration, language);
  const fullPreview = useConstitutionPreview(configuration, previewLanguage, fullscreen);
  const snippets = useMemo(
    () => constitutionSnippets(configuration, language),
    [configuration, language],
  );
  const labels = useMemo(() => markdownLabels(locale), [locale]);
  const livePreview = useMemo(
    () => (
      <section aria-label={uiText(locale, 'Живой предпросмотр', 'Live preview')}>
        <ConstitutionPreview preview={preview} locale={language} />
      </section>
    ),
    [preview, language, locale],
  );
  const text = document === null ? '' : documentMarkdown(document, language);
  return (
    <section className={styles.editor}>
      <FormField
        htmlFor={`${id}-formal`}
        label={uiText(locale, 'Формальная Конституция', 'Formal constitution')}
        hint={uiText(
          locale,
          'Документ необязателен. Правила государственного устройства действуют и без него.',
          'The document is optional. Governance rules apply with or without it.',
        )}
      >
        <Select
          id={`${id}-formal`}
          value={document === null ? 'NO' : 'YES'}
          onChange={changeFormal}
        >
          <option value="NO">
            {uiText(locale, 'Без формальной Конституции', 'No formal constitution')}
          </option>
          <option value="YES">{uiText(locale, 'Создать документ', 'Create a document')}</option>
        </Select>
      </FormField>
      {document !== null && (
        <>
          <ConstitutionNotice locale={locale} />
          <LocalizedInputField
            label={uiText(locale, 'Название Конституции', 'Constitution title')}
            value={document.title}
            onChange={changeTitle}
          />
          <ConstitutionActions
            id={id}
            locale={locale}
            language={language}
            onLanguage={changeLanguage}
            empty={text.trim() === ''}
            onTemplate={addTemplate}
            onPreview={openPreview}
          />
          <div className={styles.workspace}>
            <div>
              <MarkdownEditor
                key={language}
                value={text}
                onChange={changeText}
                label={`${uiText(locale, 'Текст Конституции', 'Constitution text')} · ${language.toUpperCase()}`}
                labels={labels}
                snippets={snippets}
                preview={livePreview}
                previewLabel={uiText(locale, 'Превью документа', 'Document preview')}
                placeholder={uiText(
                  locale,
                  'Начните писать или выберите подстановку…',
                  'Start writing or choose a placeholder…',
                )}
              />
              <p className={styles.hint}>
                {uiText(
                  locale,
                  'В текстовом режиме Enter создаёт абзац, Shift+Enter — перенос строки. Tab и Shift+Tab меняют уровень списка. В исходнике доступны Markdown и {{подстановки}}. Esc, затем Tab — выйти из поля.',
                  'In text mode, Enter starts a paragraph and Shift+Enter inserts a line break. Tab and Shift+Tab change list nesting. Source mode supports Markdown and {{placeholders}}. Escape, then Tab leaves the source field.',
                )}
              </p>
            </div>
          </div>
          <ConstitutionPreviewDialog
            id={id}
            locale={locale}
            language={previewLanguage}
            onLanguage={changePreviewLanguage}
            open={fullscreen}
            onOpen={setFullscreen}
            preview={fullPreview}
          />
        </>
      )}
    </section>
  );
}
export { ConstitutionEditor };
