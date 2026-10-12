import { TranslationFields } from './translation-fields';
import { useTranslation } from './i18n';
import { RevisionRow } from './revision-row';
import type { ReactElement } from 'react';
import type { AdminContent } from '@helicraft/alhena';
import { Alert, Button, MarkdownContent } from '@helicraft/atria';
import type { Kind } from './editor-api';
import { useContentEditor } from './use-content-editor';
import { ContentEditorFields } from './content-editor-fields';
import styles from './account.module.scss';

const emptyTranslations = {};
function ContentEditorForm({
  kind,
  document,
}: Readonly<{ kind: Kind; document: AdminContent | undefined }>): ReactElement {
  const { text } = useTranslation();

  const model = useContentEditor(kind, document);
  const handleChange = model.change;
  const translations = model.input.translations ?? emptyTranslations;
  const newTitle = kind === 'PAGE' ? 'editor.newPage' : 'editor.newPublication';
  return (
    <>
      <h1>{document === undefined ? text(newTitle) : text('editor.editing')}</h1>
      <p className={styles.paragraph}>
        {text('editor.statusLabel')} {document?.status ?? 'DRAFT'} ·{' '}
        {model.dirty ? text('editor.unsavedChanges') : text('editor.changesSaved')}
      </p>
      <div className={styles.form}>
        <ContentEditorFields model={model} pages={kind === 'PAGE'} />
        <TranslationFields
          kind="content"
          originalValues={model.input}
          values={translations}
          originalLanguage={model.input.originalLanguage ?? 'ru'}
          onChange={handleChange}
        />
        <Button tone="quiet" onClick={model.handlePreview}>
          {text('editor.previewMarkdown')}
        </Button>
        <section className={styles.section} aria-label={text('common.preview')}>
          <MarkdownContent html={model.html} />
        </section>
        {model.message === null ? null : <Alert>{text(model.message)}</Alert>}
        <div className={styles.navigation}>
          <Button disabled={model.busy} onClick={model.handleSave}>
            {text('common.save')}
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handlePublish}
          >
            {text('editor.publish')}
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handleUnpublish}
          >
            {text('editor.unpublish')}
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handleArchive}
          >
            {text('editor.archive')}
          </Button>
        </div>
        {document === undefined ? null : (
          <section className={styles.section}>
            <h2>{text('editor.revisions')}</h2>
            {model.revisions.map((revision) => (
              <RevisionRow
                key={revision.id}
                revision={revision}
                busy={model.busy}
                restore={model.restore}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
export { ContentEditorForm };
