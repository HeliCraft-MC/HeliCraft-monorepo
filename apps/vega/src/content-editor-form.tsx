import { RevisionRow } from './revision-row';
import type { ReactElement } from 'react';
import type { AdminContent } from '@helicraft/alhena';
import { Alert, Button, MarkdownContent } from '@helicraft/atria';
import type { Kind } from './editor-api';
import { useContentEditor } from './use-content-editor';
import { ContentEditorFields } from './content-editor-fields';
import styles from './account.module.scss';

function ContentEditorForm({
  kind,
  document,
}: Readonly<{ kind: Kind; document: AdminContent | undefined }>): ReactElement {
  const model = useContentEditor(kind, document);
  const newTitle = kind === 'PAGE' ? 'Новая страница' : 'Новая история';
  return (
    <>
      <h1>{document === undefined ? newTitle : 'Редактирование'}</h1>
      <p className={styles.paragraph}>
        Статус: {document?.status ?? 'DRAFT'} ·{' '}
        {model.dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены'}
      </p>
      <div className={styles.form}>
        <ContentEditorFields model={model} pages={kind === 'PAGE'} />
        <Button tone="quiet" onClick={model.handlePreview}>
          Предпросмотр Markdown
        </Button>
        <section className={styles.section} aria-label="Предпросмотр">
          <MarkdownContent html={model.html} />
        </section>
        {model.message === null ? null : <Alert>{model.message}</Alert>}
        <div className={styles.navigation}>
          <Button disabled={model.busy} onClick={model.handleSave}>
            Сохранить
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handlePublish}
          >
            Опубликовать
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handleUnpublish}
          >
            Снять с публикации
          </Button>
          <Button
            tone="quiet"
            disabled={model.busy || document === undefined || model.dirty}
            onClick={model.handleArchive}
          >
            Архивировать
          </Button>
        </div>
        {document === undefined ? null : (
          <section className={styles.section}>
            <h2>История редакций</h2>
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
