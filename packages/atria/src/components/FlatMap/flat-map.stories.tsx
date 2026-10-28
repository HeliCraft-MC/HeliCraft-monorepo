import { useCallback, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlatMap } from './flat-map';
import type { FlatGeometry, FlatMapMode, FlatMapProps } from './model';
import { Button } from '../Button/button';

const fixture: FlatGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [-96, -64],
      [96, -64],
      [96, 64],
      [-96, 64],
      [-96, -64],
    ],
    [
      [-16, -16],
      [-16, 16],
      [16, 16],
      [16, -16],
      [-16, -16],
    ],
  ],
};
const meta = {
  title: 'Data display/FlatMap',
  component: FlatMap,
  parameters: {
    docs: {
      description: {
        component:
          'Flat planar raster map with host-owned published shapes and controlled Polygon/MultiPolygon drafts, including holes. Leaflet and Geoman load only in the browser. onViewChange reports the current planar center and zoom for host-owned share links. The host supplies world identity, a safe same-origin tile URL, localized labels, legal authorization, save/validation workflow and any keyboard coordinate editor. For squaremap, use 512px tiles, native zoom 3 and extra zoom 2; [X,Z] maps to [-Z/8,X/8] in CRS.Simple. Published shapes cannot be edited or cut. Tab reaches localized zoom controls and the map; arrows pan and +/− zoom. Geoman drawing/editing is pointer based; Escape cancels drawing. Supply host-owned coordinate controls for keyboard-only geometry editing. A compass marks north (negative Z); loading and unavailable states cover the map while tile warnings leave boundaries usable. No networking occurs on the server. Width follows the container; --flat-map-height sets surface height with a 22rem minimum, and reduced motion disables zoom animation. Fixture tiles below are a neutral component backdrop, never Minecraft terrain or acceptance evidence.',
      },
    },
  },
  args: {
    label: 'Planar component fixture — no Minecraft data',
    loadingLabel: 'Loading interactive map…',
    errorLabel: 'Interactive map failed to load.',
    tileErrorLabel: 'Terrain tiles unavailable; boundaries remain visible.',
    tileUrl:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="512" height="512"%3E%3Crect width="512" height="512" fill="%23232d37"/%3E%3C/svg%3E',
    attribution: 'Local component fixture',
    maxNativeZoom: 3,
    extraZoom: 2,
    center: [0, 0],
    zoom: 3,
    shapes: [
      { id: 'fixture', name: 'Fixture polygon with a hole', color: '#46b7a0', geometry: fixture },
    ],
  },
} satisfies Meta<typeof FlatMap>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReadOnly: Story = {};
export const Empty: Story = { args: { shapes: [] } };
export const Selected: Story = {
  args: {
    shapes: [
      {
        id: 'fixture',
        name: 'Selected territory',
        color: '#46b7a0',
        geometry: fixture,
        selected: true,
      },
    ],
  },
};
export const Russian: Story = {
  args: {
    locale: 'ru',
    label: 'Плоская карта — пример компонента',
    loadingLabel: 'Загрузка карты…',
    errorLabel: 'Не удалось загрузить карту.',
    tileErrorLabel: 'Поверхность недоступна; границы остаются видимыми.',
  },
};
export const UnavailableTiles: Story = {
  args: { tileUrl: '/unavailable-flat-map-fixture/{z}/{x}/{y}.png' },
};
export const LongLabels: Story = {
  args: {
    shapes: [
      {
        id: 'long',
        name: 'A long localized name that wraps within its label without hiding the complete polygon boundary',
        color: '#c39be8',
        geometry: fixture,
      },
    ],
  },
};
function EditorFixture(props: FlatMapProps): ReactElement {
  const [geometry, setGeometry] = useState<FlatGeometry | null>(fixture);
  const [mode, setMode] = useState<FlatMapMode>('view');
  const select = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    const { value } = event.currentTarget;
    if (
      value === 'view' ||
      value === 'draw' ||
      value === 'edit' ||
      value === 'cut' ||
      value === 'remove'
    ) {
      setMode(value);
    }
  }, []);
  return (
    <>
      <div>
        {(['view', 'draw', 'edit', 'cut', 'remove'] as const).map((value) => (
          <Button key={value} value={value} onClick={select} aria-pressed={value === mode}>
            {value}
          </Button>
        ))}
      </div>
      <FlatMap
        {...props}
        geometry={geometry}
        mode={mode}
        onChange={setGeometry}
        onModeChange={setMode}
      />
      <output aria-live="polite">{JSON.stringify(geometry)}</output>
    </>
  );
}
export const Editable: Story = { render: EditorFixture, args: { shapes: [] } };
export const Narrow: Story = {
  ...Editable,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
