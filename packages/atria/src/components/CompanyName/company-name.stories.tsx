import type { Meta, StoryObj } from '@storybook/react-vite';
import { CompanyName } from './company-name';

const meta = {
  title: 'Identity/CompanyName',
  component: CompanyName,
  tags: ['autodocs'],
  args: {
    name: 'Aurora Trading',
    href: '/companies/example',
    color: '#338899',
    description: 'A registered player company.',
    facts: 'Registration: Aurora',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Inline company identity for references, owners, portfolios, payments and editorial links. Uses the same keyboard-focus and hover preview as PlayerNickname and StateName. A square logo replaces the decorative color mark when available. Public facts only; product code fetches published previews lazily. Use linked=false inside an existing card or selection button to avoid nested interactive elements.',
      },
    },
  },
} satisfies Meta<typeof CompanyName>;
const Default: StoryObj<typeof meta> = {};
const LongName: StoryObj<typeof meta> = {
  args: { name: 'A company with a long localized name that wraps inside a narrow container' },
};
const InsideControl: StoryObj<typeof meta> = { args: { linked: false } };
export { Default, LongName, InsideControl };
export default meta;
