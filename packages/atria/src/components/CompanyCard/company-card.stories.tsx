import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2 } from 'lucide-react';
import { CompanyCard } from './company-card';

const meta = {
  title: 'Data display/CompanyCard',
  component: CompanyCard,
  tags: ['autodocs'],
  args: {
    name: 'Базальт',
    sector: 'Стройматериалы',
    description: 'Добывает камень и снабжает строительные команды.',
    image:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Cpath fill="%23394742" d="M0 0h800v500H0z"/%3E%3Cpath fill="%235e7166" d="M0 350 200 100 450 400 600 180 800 350v150H0z"/%3E%3C/svg%3E',
    logo: <Building2 size={28} />,
    facts: [
      { label: 'Государство', value: 'Речной союз' },
      { label: 'Команда', value: '6 участников' },
    ],
  },
} satisfies Meta<typeof CompanyCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LongName: Story = { args: { name: 'Северная объединённая транспортная компания' } };
export const English: Story = {
  args: {
    name: 'Basalt',
    sector: 'Building materials',
    description: 'Quarries stone and supplies building teams.',
    facts: [
      { label: 'State', value: 'River Union' },
      { label: 'Team', value: '6 members' },
    ],
  },
};
