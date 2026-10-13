import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { StateConfiguration } from '@helicraft/alhena';
import { FlagsStep } from '../src/states/flags-step';
import { BannerPreview } from '../src/states/banner-preview';
import { patternColumns, dyeRows } from '../src/states/banner-model';
import { StateConfigurationSchema } from '../../antares/src/modules/states/contracts';
import { emptyConfiguration } from '../../antares/src/modules/states/domain';
import { LocaleProvider } from '../src/locale-provider';

function FlagsHarness(): ReactElement {
  const [configuration, setConfiguration] = useState<StateConfiguration>(emptyConfiguration());
  return (
    <>
      <FlagsStep configuration={configuration} onChange={setConfiguration} />
      <output data-testid="configuration">{JSON.stringify(configuration)}</output>
    </>
  );
}
function state(): StateConfiguration {
  return StateConfigurationSchema.parse(
    JSON.parse(screen.getByTestId('configuration').textContent ?? '{}'),
  );
}
function buttonAt(name: string, position: number): HTMLElement {
  const button = screen.getAllByRole('button', { name })[position];
  if (!button) {
    throw new Error(`Missing ${name} button ${position}`);
  }
  return button;
}
function mount(): void {
  render(
    <LocaleProvider locale="en">
      <FlagsHarness />
    </LocaleProvider>,
  );
}
afterEach(cleanup);
describe('texture-based flag editor', () => {
  it('uses the archived atlas for every pattern and dye, including complex charges and gradients', () => {
    const design = emptyConfiguration().verticalBanner;
    design.layers = [
      { pattern: 'creeper', color: 'red' },
      { pattern: 'gradient', color: 'white' },
    ];
    const { container } = render(<BannerPreview design={design} />);
    expect(container.querySelectorAll('path, linearGradient')).toHaveLength(0);
    expect(container.querySelectorAll('image')).toHaveLength(3);
    for (const image of container.querySelectorAll('image')) {
      expect(image).toHaveAttribute('href', '/banner/patterns.webp');
    }
    expect(container.querySelectorAll('svg')[1]).toHaveAttribute('viewBox', '0 504 20 40');
    expect(container.querySelectorAll('svg')[2]).toHaveAttribute('viewBox', '88 630 20 40');
    expect(container.querySelectorAll('svg')[3]).toHaveAttribute('viewBox', '308 42 20 40');
    expect(Object.values(patternColumns).toSorted((left, right) => left - right)).toStrictEqual(
      Array.from({ length: 42 }, (_unused, index) => index + 1),
    );
    expect(Object.values(dyeRows).toSorted((left, right) => left - right)).toStrictEqual(
      Array.from({ length: 16 }, (_unused, index) => index + 1),
    );
  });
  it('preserves independent designs when switching orientation and horizontal source', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Creeper' }));
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal flag' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy vertical banner' }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Base color' })).getByRole('button', {
        name: 'Red',
      }),
    );
    expect(state().horizontalFlag).toMatchObject({
      mode: 'BANNER',
      design: { baseColor: 'red', layers: [{ pattern: 'creeper' }] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Vertical banner' }));
    expect(state().verticalBanner.baseColor).toBe('blue');
    expect(screen.getByRole('img', { name: 'Flag preview' })).toHaveAttribute(
      'viewBox',
      '0 0 20 40',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal flag' }));
    expect(screen.getByRole('img', { name: 'Flag preview' })).toHaveAttribute(
      'viewBox',
      '0 0 40 20',
    );
    fireEvent.change(screen.getByLabelText('Flag source'), { target: { value: 'PNG' } });
    fireEvent.change(screen.getByLabelText('Flag source'), { target: { value: 'BANNER' } });
    expect(state().horizontalFlag).toMatchObject({
      design: { baseColor: 'red', layers: [{ pattern: 'creeper' }] },
    });
  });
  it('adds visible patterns, edits selected colors, reorders/removes layers and enforces the six-pattern limit', () => {
    mount();
    fireEvent.click(
      within(screen.getByRole('group', { name: 'New pattern color' })).getByRole('button', {
        name: 'Yellow',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Creeper' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skull' }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Selected layer color' })).getByRole('button', {
        name: 'Red',
      }),
    );
    fireEvent.click(buttonAt('Move layer up', 1));
    expect(state().verticalBanner.layers).toStrictEqual([
      { pattern: 'skull', color: 'red' },
      { pattern: 'creeper', color: 'yellow' },
    ]);
    fireEvent.click(buttonAt('Remove layer', 0));
    expect(state().verticalBanner.layers).toStrictEqual([{ pattern: 'creeper', color: 'yellow' }]);
    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Globe' }));
    }
    expect(screen.getByRole('button', { name: 'Flow' })).toBeDisabled();
    expect(state().verticalBanner.layers).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Clear patterns' }));
    expect(state().verticalBanner.layers).toHaveLength(0);
    expect(state().verticalBanner.baseColor).toBe('blue');
  });
});
