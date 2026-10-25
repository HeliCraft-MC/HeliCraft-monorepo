import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { ToastProvider } from './toast';
import { useToast } from '../../toast-manager';
import { Button } from '../Button/button';

function Notify(): ReactElement {
  const manager = useToast();
  const notify = useCallback((): void => {
    manager.add({ title: 'Saved', description: 'The example draft was saved.' });
  }, [manager]);
  return <Button onClick={notify}>Show saved notification</Button>;
}
const meta = {
  title: 'Feedback/Toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Place ToastProvider around the notification scope and call useToast().add with translated title and description after a real outcome. Notifications are announced and dismissible. The host owns persistence; never use a transient toast as the only record of a blocking error or required action. The viewport is bounded on small screens. This example changes no external data.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Notify />
    </ToastProvider>
  ),
};
