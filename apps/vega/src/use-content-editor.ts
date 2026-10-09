// oxlint-disable no-alert, max-statements -- Native navigation confirmations cover document unload; this hook composes bounded actions and state, with API work in editor-api.ts.
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminContent } from '@helicraft/alhena';
import { inputFrom, categorySchema } from './editor-input';
import {
  writeDocument,
  transitionDocument,
  documentRevisions,
  restoreDocument,
  previewDocument,
} from './editor-api';
import type { Kind, ContentInput, Revision } from './editor-api';
import { errorMessage } from './account-api';

interface EditorModel {
  readonly input: ContentInput;
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly message: string | null;
  readonly html: string;
  readonly revisions: readonly Revision[];
  readonly change: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  readonly handleSave: () => void;
  readonly handlePreview: () => void;
  readonly handlePublish: () => void;
  readonly handleUnpublish: () => void;
  readonly handleArchive: () => void;
  readonly restore: (revision: number) => void;
}
// oxlint-disable-next-line max-lines-per-function -- This hook composes independently bounded editor actions and queries; API calls live in editor-api.ts.
function useContentEditor(kind: Kind, document: AdminContent | undefined): EditorModel {
  const id = document?.id ?? null;
  const [savedInput, setSavedInput] = useState(() => JSON.stringify(inputFrom(document)));
  const [input, setInput] = useState<ContentInput>(() => inputFrom(document));
  const saved = useRef(JSON.stringify(inputFrom(document)));
  const [html, setHtml] = useState(document?.html ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queries = useQueryClient();
  const dirty = JSON.stringify(input) !== savedInput;
  const revisions = useQuery({
    queryKey: ['revisions', kind, id],
    enabled: id !== null,
    queryFn: async () => (id === null ? [] : await documentRevisions(kind, id)),
  });
  // Native confirmation is deliberate: it also works for document-level unloads.
  useBlocker({
    shouldBlockFn: () =>
      JSON.stringify(input) !== saved.current &&
      !globalThis.confirm('Есть несохранённые изменения. Покинуть редактор?'),
    enableBeforeUnload: dirty,
  });
  async function refresh(): Promise<void> {
    await queries.invalidateQueries({ queryKey: ['document', kind, id] });
    await queries.invalidateQueries({ queryKey: ['revisions', kind, id] });
  }
  async function saving(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const result = await writeDocument(kind, id, input);
      saved.current = JSON.stringify(input);
      setSavedInput(saved.current);
      setMessage('Сохранено');
      if (id !== null) {
        await refresh();
      } else if (kind === 'PAGE') {
        await navigate({ to: '/admin/pages/$pageId', params: { pageId: result.id } });
      } else {
        await navigate({ to: '/admin/chronicle/$entryId', params: { entryId: result.id } });
      }
    } catch (error) {
      setMessage(errorMessage(error));
    }
    setBusy(false);
  }
  async function previewing(): Promise<void> {
    try {
      setHtml(await previewDocument(input.markdown));
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }
  async function transition(state: 'publish' | 'unpublish' | 'archive'): Promise<void> {
    if (id === null || dirty) {
      setMessage('Сначала сохрани изменения');
      return;
    }
    setBusy(true);
    try {
      await transitionDocument(kind, id, state);
      await refresh();
      setMessage('Статус публикации изменён');
    } catch (error) {
      setMessage(errorMessage(error));
    }
    setBusy(false);
  }
  async function restoring(revision: number): Promise<void> {
    if (
      id === null ||
      (dirty && !globalThis.confirm('Заменить несохранённые изменения предыдущей редакцией?'))
    ) {
      return;
    }
    setBusy(true);
    try {
      await restoreDocument(kind, id, revision);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    }
    setBusy(false);
  }
  function change(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    const { target } = event;
    const { name } = target;
    if (name === 'isFeatured' && target instanceof HTMLInputElement) {
      setInput({ ...input, isFeatured: target.checked });
    } else if (name === 'category') {
      setInput({ ...input, category: categorySchema.parse(target.value) });
    } else if (name === 'seoTitle' || name === 'seoDescription') {
      setInput({ ...input, [name]: target.value || null });
    } else {
      setInput({ ...input, [name]: target.value });
    }
  }
  function handleSave(): void {
    void saving();
  }
  function handlePreview(): void {
    void previewing();
  }
  function handlePublish(): void {
    void transition('publish');
  }
  function handleUnpublish(): void {
    void transition('unpublish');
  }
  function handleArchive(): void {
    void transition('archive');
  }
  function restore(revision: number): void {
    void restoring(revision);
  }
  return {
    input,
    dirty,
    busy,
    message,
    html,
    revisions: revisions.data ?? [],
    change,
    handleSave,
    handlePreview,
    handlePublish,
    handleUnpublish,
    handleArchive,
    restore,
  };
}
export { useContentEditor, type EditorModel };
