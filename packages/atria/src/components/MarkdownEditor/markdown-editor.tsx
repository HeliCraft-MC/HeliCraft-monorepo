// oxlint-disable import/max-dependencies -- The shared editor composes TipTap extensions and existing form primitives.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Button } from '../Button/button';
import { Select } from '../Select/select';
import { Textarea } from '../Textarea/textarea';
import { MarkdownToolbar } from './markdown-toolbar';
import type { MarkdownEditorLabels } from './markdown-toolbar';
import styles from './markdown-editor.module.scss';

interface MarkdownSnippet {
  readonly id: string;
  readonly label: string;
  readonly content: string;
}
interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
  readonly labels: MarkdownEditorLabels;
  readonly snippets?: readonly MarkdownSnippet[];
  readonly placeholder?: string;
}
const EMPTY_SNIPPETS: readonly MarkdownSnippet[] = [];
const INDENT_SIZE = 4;
// oxlint-disable-next-line max-lines-per-function -- One controlled visual/source editor composes commands, cursor-aware insertion and source indentation.
function MarkdownEditor({
  value,
  onChange,
  label,
  labels,
  snippets = EMPTY_SNIPPETS,
  placeholder = '',
}: MarkdownEditorProps): ReactElement {
  const id = useId();
  const [source, setSource] = useState(false);
  const [snippetId, setSnippetId] = useState('');
  const editorRef = useRef<NonNullable<ReturnType<typeof useEditor>> | null>(null);
  const indentRef = useRef(true);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const extensions = useMemo(
    () => [
      StarterKit.configure({ link: { openOnClick: false } }),
      Markdown.configure({
        indentation: { style: 'space', size: INDENT_SIZE },
        markedOptions: { breaks: true },
      }),
      TableKit,
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  );
  const editor = useEditor({
    extensions,
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      handleKeyDown: (_view, event): boolean => {
        const { current } = editorRef;
        if (event.key !== 'Tab' || current?.isActive('listItem') !== true) {
          return false;
        }
        const changed = event.shiftKey
          ? current.commands.liftListItem('listItem')
          : current.commands.sinkListItem('listItem');
        if (changed) {
          event.preventDefault();
        }
        return changed;
      },
      attributes: {
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: current }): void => {
      onChange(current.getMarkdown());
    },
  });
  useEffect(() => {
    editorRef.current = editor;
    if (editor && editor.getMarkdown() !== value) {
      editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }
  }, [editor, value]);
  const editVisual = useCallback((): void => {
    setSource(false);
  }, []);
  const editSource = useCallback((): void => {
    setSource(true);
  }, []);
  const changeSource = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange],
  );
  const selectSnippet = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSnippetId(event.currentTarget.value);
  }, []);
  const insert = useCallback((): void => {
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    if (source && sourceRef.current) {
      const field = sourceRef.current;
      const start = field.selectionStart;
      const end = field.selectionEnd;
      onChange(`${value.slice(0, start)}${snippet.content}${value.slice(end)}`);
      requestAnimationFrame(() => {
        field.focus();
        field.setSelectionRange(start + snippet.content.length, start + snippet.content.length);
      });
    } else {
      editor?.chain().focus().insertContent(snippet.content, { contentType: 'markdown' }).run();
    }
  }, [editor, snippetId, snippets, source, value, onChange]);
  const sourceTab = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Escape') {
        indentRef.current = false;
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      if (!indentRef.current) {
        indentRef.current = true;
        return;
      }
      event.preventDefault();
      const field = event.currentTarget;
      const start = field.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      if (event.shiftKey) {
        const indent = /^ {1,4}/u.exec(value.slice(lineStart))?.[0].length ?? 0;
        onChange(`${value.slice(0, lineStart)}${value.slice(lineStart + indent)}`);
        requestAnimationFrame(() => {
          field.setSelectionRange(
            Math.max(lineStart, start - indent),
            Math.max(lineStart, start - indent),
          );
        });
      } else {
        const padding = ' '.repeat(INDENT_SIZE);
        onChange(`${value.slice(0, start)}${padding}${value.slice(field.selectionEnd)}`);
        requestAnimationFrame(() => {
          field.setSelectionRange(start + INDENT_SIZE, start + INDENT_SIZE);
        });
      }
    },
    [onChange, value],
  );
  return (
    <section className={styles.editor}>
      <div className={styles.modes}>
        <Button tone="quiet" aria-pressed={!source} onClick={editVisual}>
          {labels.visual}
        </Button>
        <Button tone="quiet" aria-pressed={source} onClick={editSource}>
          {labels.source}
        </Button>
      </div>
      <MarkdownToolbar editor={editor} labels={labels} disabled={source} />
      {snippets.length > 0 && (
        <div className={styles.snippets}>
          <label htmlFor={id}>{labels.snippet}</label>
          <Select id={id} value={snippetId} onChange={selectSnippet}>
            <option value="">—</option>
            {snippets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button tone="quiet" onClick={insert} disabled={snippetId === ''}>
            {labels.insert}
          </Button>
        </div>
      )}
      {source ? (
        <Textarea
          ref={sourceRef}
          value={value}
          onChange={changeSource}
          onKeyDown={sourceTab}
          aria-label={label}
          className={styles.source}
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} className={styles.content} />
      )}
    </section>
  );
}
export { MarkdownEditor, type MarkdownEditorProps, type MarkdownSnippet };
export type { MarkdownEditorLabels } from './markdown-toolbar';
