import type { Meta, StoryObj } from '@storybook/react-vite';
import { StateName } from './state-name';

const meta = {
  title: 'Components/StateName',
  component: StateName,
  tags: ['autodocs'],
  args: {
    name: 'Aurora',
    href: '/states/aurora',
    color: '#3c44aa',
    description: 'A coastal community.',
    facts: '42 citizens · 3 offices',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Inline state identity with a color mark, a direct state link and a compact hover or keyboard-focus preview. Supply factual public summaries only. The color mark is decorative; text retains theme contrast. Use StateCard for full directory items. onPreview can request public data lazily; long descriptions are clipped to a compact summary.',
      },
    },
  },
} satisfies Meta<typeof StateName>;
const Default: StoryObj<typeof meta> = {};
const WithoutPreview: StoryObj<typeof meta> = {
  args: { description: undefined, facts: undefined },
};
const LightColor: StoryObj<typeof meta> = {
  args: { color: '#ffffff', name: 'A very long state name that wraps on mobile' },
};
const LongDescription: StoryObj<typeof meta> = {
  args: {
    description:
      'A public description may include the community history, its founding goals and its approach to cooperation. The hover preview remains a short introduction even when the full description covers several paragraphs. Follow the state link to read the complete description and explore citizenship, offices, decision policies and the constitution. Keeping this text compact makes the preview usable on small screens while preserving the direct link to all public information.',
  },
};
export { Default, LightColor, LongDescription, WithoutPreview };
export default meta;
