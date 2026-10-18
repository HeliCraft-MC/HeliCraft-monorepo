import type { Meta, StoryObj } from '@storybook/react-vite';
import { FieldHelp } from './field-help';

const meta = {
  title: 'Components/FieldHelp',
  component: FieldHelp,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Contextual field explanations. Hover opens a temporary explanation. Click pins it until another click, outside press or Escape. Keyboard users open it with Enter or Space. Keep the label specific to the field and use a concrete example.',
      },
    },
  },
  args: {
    label: 'Quorum, %',
    content:
      'Minimum participation from the frozen electorate. With 100 eligible voters and a 40% quorum, at least 40 people must vote. Abstentions count as participation.',
  },
} satisfies Meta<typeof FieldHelp>;
const Default: StoryObj<typeof meta> = {};
const RedundantHelp: StoryObj<typeof meta> = { args: { label: 'Название', content: 'Название' } };
export { Default, RedundantHelp };
export default meta;
