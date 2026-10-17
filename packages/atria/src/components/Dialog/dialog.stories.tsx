import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './dialog';
import { Button } from '../Button/button';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Focus-managed modal with Escape dismissal. Fullscreen provides a scrollable document workspace with a bounded reading width, content aligned to the top and a compact close control. For public documents also provide a normal SSR document route.',
      },
    },
  },
  args: {
    title: 'Review changes',
    closeLabel: 'Close',
    children: 'Changes stay in the draft until published.',
  },
} satisfies Meta<typeof Dialog>;
function ControlledDialog(): ReactElement {
  const [open, setOpen] = useState(true);
  const show = useCallback((): void => {
    setOpen(true);
  }, []);
  return (
    <>
      <Button onClick={show}>Open preview</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Constitution preview" closeLabel="Close">
        <p>
          A controlled dialog supports async previews and confirmations while retaining keyboard
          focus management.
        </p>
      </Dialog>
    </>
  );
}
const Triggered: StoryObj<typeof meta> = { args: { trigger: 'Open review' } };
const Controlled: StoryObj<typeof meta> = { render: ControlledDialog };
const Fullscreen: StoryObj<typeof meta> = {
  args: { trigger: 'Open document preview', size: 'fullscreen' },
};
export { Triggered, Controlled, Fullscreen };
export default meta;
