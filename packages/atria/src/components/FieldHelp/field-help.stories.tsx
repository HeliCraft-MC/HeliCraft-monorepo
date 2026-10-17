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
          'Contextual field explanations. Hover or tap the information button; keyboard users open it with Enter or Space and dismiss with Escape. Keep the label specific to the field and use a concrete example.',
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
export { Default };
export default meta;
