import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileDropzone } from './file-dropzone';

const meta = {
  title: 'Atria/FileDropzone',
  component: FileDropzone,
  tags: ['autodocs'],
  args: {
    id: 'photo',
    label: 'Перетащите файл или нажмите для выбора',
    hint: 'PNG, JPEG, WebP · до 10 МиБ',
    accept: 'image/png,image/jpeg,image/webp',
    file: null,
    onChoose: (file): void => {
      void file;
    },
  },
} satisfies Meta<typeof FileDropzone>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Selected: Story = {
  args: { file: new File([''], 'town.webp', { type: 'image/webp' }) },
};
export const Disabled: Story = { args: { disabled: true } };
export const English: Story = {
  args: { label: 'Drop a file or click to browse', hint: 'PNG, JPEG, WebP · up to 10 MiB' },
};
