import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoneyAmount } from './money-amount';

const meta = {
  title: 'Data display/MoneyAmount',
  component: MoneyAmount,
  tags: ['autodocs'],
  args: { minor: '123456789', code: 'HCM', locale: 'ru' },
  parameters: {
    docs: {
      description: {
        component:
          'Exact two-decimal monetary display from integer strings. Supports large and negative values without floating point conversion. The host supplies the currency code; no exchange or aggregate balance is implied.',
      },
    },
  },
} satisfies Meta<typeof MoneyAmount>;
const Default: StoryObj<typeof meta> = {};
const Large: StoryObj<typeof meta> = { args: { minor: '999999999999999999999999999999' } };
const English: StoryObj<typeof meta> = { args: { locale: 'en' } };
const Negative: StoryObj<typeof meta> = { args: { minor: '-1' } };
const EmptyBalance: StoryObj<typeof meta> = { args: { minor: '0' } };
export { Default, Large, English, Negative, EmptyBalance };
export default meta;
