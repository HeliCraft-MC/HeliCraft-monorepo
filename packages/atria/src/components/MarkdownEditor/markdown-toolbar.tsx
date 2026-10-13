import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useEditorState } from '@tiptap/react';
import type { useEditor } from '@tiptap/react';
import { Button } from '../Button/button';
import styles from './markdown-editor.module.scss';

type EditorInstance = NonNullable<ReturnType<typeof useEditor>>;
interface MarkdownEditorLabels {
  readonly bold: string;
  readonly italic: string;
  readonly heading: string;
  readonly bulletList: string;
  readonly orderedList: string;
  readonly quote: string;
  readonly indent: string;
  readonly outdent: string;
  readonly undo: string;
  readonly redo: string;
  readonly visual: string;
  readonly source: string;
  readonly insert: string;
  readonly snippet: string;
}
// oxlint-disable-next-line max-lines-per-function -- The accessible toolbar declares the supported Markdown formatting commands.
function MarkdownToolbar({
  editor,
  labels,
  disabled,
}: Readonly<{
  editor: EditorInstance | null;
  labels: MarkdownEditorLabels;
  disabled: boolean;
}>): ReactElement {
  const active = useEditorState({
    editor,
    selector: (snapshot) => ({
      bold: snapshot.editor?.isActive('bold'),
      italic: snapshot.editor?.isActive('italic'),
      heading: snapshot.editor?.isActive('heading'),
      bulletList: snapshot.editor?.isActive('bulletList'),
      orderedList: snapshot.editor?.isActive('orderedList'),
      blockquote: snapshot.editor?.isActive('blockquote'),
    }),
  });
  const commands = useMemo(
    // oxlint-disable-next-line max-lines-per-function -- Each command pairs its active state with one editor action.
    () => [
      {
        label: labels.bold,
        active: active?.bold,
        handleClick: (): void => {
          editor?.chain().focus().toggleBold().run();
        },
      },
      {
        label: labels.italic,
        active: active?.italic,
        handleClick: (): void => {
          editor?.chain().focus().toggleItalic().run();
        },
      },
      {
        label: labels.heading,
        active: active?.heading,
        handleClick: (): void => {
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        },
      },
      {
        label: labels.bulletList,
        active: active?.bulletList,
        handleClick: (): void => {
          editor?.chain().focus().toggleBulletList().run();
        },
      },
      {
        label: labels.orderedList,
        active: active?.orderedList,
        handleClick: (): void => {
          editor?.chain().focus().toggleOrderedList().run();
        },
      },
      {
        label: labels.quote,
        active: active?.blockquote,
        handleClick: (): void => {
          editor?.chain().focus().toggleBlockquote().run();
        },
      },
      {
        label: labels.indent,
        active: false,
        handleClick: (): void => {
          editor?.chain().focus().sinkListItem('listItem').run();
        },
      },
      {
        label: labels.outdent,
        active: false,
        handleClick: (): void => {
          editor?.chain().focus().liftListItem('listItem').run();
        },
      },
      {
        label: labels.undo,
        active: false,
        handleClick: (): void => {
          editor?.chain().focus().undo().run();
        },
      },
      {
        label: labels.redo,
        active: false,
        handleClick: (): void => {
          editor?.chain().focus().redo().run();
        },
      },
    ],
    [editor, labels, active],
  );
  const preventBlur = useCallback((event: React.MouseEvent): void => {
    event.preventDefault();
  }, []);
  return (
    <div className={styles.toolbar}>
      {commands.map((command) => (
        <Button
          key={command.label}
          tone="quiet"
          disabled={disabled || editor === null}
          aria-pressed={command.active === true}
          onMouseDown={preventBlur}
          onClick={command.handleClick}
        >
          {command.label}
        </Button>
      ))}
    </div>
  );
}
export { MarkdownToolbar, type MarkdownEditorLabels };
