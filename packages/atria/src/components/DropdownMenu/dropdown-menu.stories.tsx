import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { DropdownMenu } from './dropdown-menu';

function Example(): ReactElement {
  const [selection, setSelection] = useState('None');
  const select = useCallback((): void => {
    setSelection('Open profile');
  }, []);
  const items = useMemo(
    () => [
      { id: 'profile', label: 'Open profile', handleSelect: select },
      { id: 'disabled', label: 'Unavailable action', handleSelect: select, disabled: true },
    ],
    [select],
  );
  return (
    <section>
      <DropdownMenu trigger="Profile actions" items={items} />
      <p>Selected: {selection}</p>
    </section>
  );
}
const meta = {
  title: 'Overlays/DropdownMenu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Collect secondary actions under a named trigger. Supply translated item labels, stable IDs and callbacks; the host owns authorization and side effects. Use arrows to navigate, Enter/Space to choose and Escape to dismiss. Disabled items do not run callbacks. Keep essential primary actions visible outside menus and use short wrapping labels on mobile.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: Example };
