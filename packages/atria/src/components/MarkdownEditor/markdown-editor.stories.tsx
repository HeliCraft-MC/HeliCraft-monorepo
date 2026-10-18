import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownEditor } from './markdown-editor';
import type { MarkdownEditorLabels } from './markdown-editor';

const labels: MarkdownEditorLabels = {
  bold: 'Bold',
  italic: 'Italic',
  heading: 'Heading',
  bulletList: 'List',
  orderedList: 'Numbered list',
  quote: 'Quote',
  indent: 'Indent',
  outdent: 'Outdent',
  undo: 'Undo',
  redo: 'Redo',
  visual: 'Text editor',
  source: 'Markdown source',
  snippet: 'Insert text',
  insert: 'Insert',
};
const preview = (
  <article>
    <h2>Server-rendered preview</h2>
    <p>The host supplies Antares-sanitized document content here.</p>
  </article>
);
function Example(): ReactElement {
  const [value, setValue] = useState(
    '# Community charter\n\nA paragraph with **emphasis**.\n\n- Rights\n    - Participation\n\n> Every citizen can take part.\n\n{{state.name}}',
  );
  return (
    <>
      <MarkdownEditor
        value={value}
        onChange={setValue}
        label="Charter text"
        labels={labels}
        preview={preview}
        previewLabel="Document preview"
      />
      <pre>{value}</pre>
    </>
  );
}
const meta = { title: 'Atria/MarkdownEditor', component: Example } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const VisualAndSource: Story = {};
