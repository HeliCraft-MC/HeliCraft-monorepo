import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './tooltip';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    children: 'Permanent identity',
    content: 'A UUID remains stable when a player changes their name.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Add short supplementary context to the focusable trigger. Supply readable children and translated text content. Hover or focus opens the explanation; Escape dismisses it. Do not hide required instructions or actions here, since touch users need essential information in visible content. For longer field explanations use FieldHelp.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
