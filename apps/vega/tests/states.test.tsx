// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
// oxlint-disable react/no-multi-comp -- Isolated test harnesses exercise different controlled editor states.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { LocalizedInput, StateConfiguration, Principal } from '@helicraft/alhena';
import { LocalizedInputField } from '../src/states/localized-input';
import { StateWizardStep } from '../src/states/wizard-step';
import { StateReview } from '../src/states/review';
import { CONSTITUTION_TEMPLATE_EN } from '../src/states/constitution-markdown';
import { slugify } from '../src/states/slug';
import { emptyConfiguration } from '../../antares/src/modules/states/domain';
import { applyPreset } from '../../antares/src/modules/states/presets';
import { LocaleContext } from '../src/locale-context';

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const principal: Principal = {
  id: USER,
  username: 'Founder',
  status: 'ACTIVE',
  currentSkinId: null,
  roles: ['PLAYER'],
  permissions: [],
  createdAt: '2026-10-13T00:00:00Z',
};
const noCofounders: [] = [];
function handleCofounders(): void {
  /* This harness exercises governance only. */
}
const english = {
  locale: 'en' as const,
  setLocale: (): void => {
    /* The test fixes the UI language. */
  },
};
function LocalizedHarness(): ReactElement {
  const [value, setValue] = useState<LocalizedInput>({ ru: 'Аврора', en: 'Aurora' });
  return <LocalizedInputField label="Name" value={value} onChange={setValue} />;
}
function WizardHarness({ step }: Readonly<{ step: number }>): ReactElement {
  const [configuration, setConfiguration] = useState<StateConfiguration>({
    ...emptyConfiguration(),
    name: { en: 'Aurora' },
    slug: 'aurora',
    governance: applyPreset('AUTOCRACY', USER),
  });
  return (
    <StateWizardStep
      step={step}
      configuration={configuration}
      onChange={setConfiguration}
      principal={principal}
      cofounders={noCofounders}
      setCofounders={handleCofounders}
    />
  );
}
function mount(component: ReactElement): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <LocaleContext.Provider value={english}>
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    </LocaleContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('state editor', () => {
  it('keeps translated values while switching languages and editing', () => {
    mount(<LocalizedHarness />);
    fireEvent.change(screen.getByLabelText('Name · English'), {
      target: { value: 'Aurora Republic' },
    });
    fireEvent.click(screen.getByText('Translations'));
    expect(screen.getByLabelText('Name · Русский')).toHaveValue('Аврора');
    fireEvent.click(screen.getByText('Translations'));
    expect(screen.getByLabelText('Name · English')).toHaveValue('Aurora Republic');
  });
  it('confirms replacement before applying a different governance preset', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(applyPreset('DIRECT_DEMOCRACY', USER)));
    mount(<WizardHarness step={5} />);
    fireEvent.click(screen.getByRole('button', { name: 'Direct democracy' }));
    expect(screen.getByRole('dialog', { name: 'Replace configuration?' })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply preset' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('changes offices and retains stable identity while editing term rules', () => {
    mount(<WizardHarness step={7} />);
    fireEvent.change(screen.getByLabelText('Term'), { target: { value: 'FIXED_TERM' } });
    expect(screen.getByLabelText('Term in days')).toHaveValue(90);
    fireEvent.change(screen.getByLabelText('Term in days'), { target: { value: '120' } });
    expect(screen.getByLabelText('Term in days')).toHaveValue(120);
  });
  it('edits policy composition using actual office choices', () => {
    mount(<WizardHarness step={9} />);
    const heading = screen.getByRole('heading', { name: 'Amend governance' });
    const section = heading.closest('section');
    if (!section) {
      throw new Error('Policy section missing');
    }
    fireEvent.change(within(section).getByLabelText('Who makes this decision?'), {
      target: { value: 'COMBINED' },
    });
    expect(within(section).getByLabelText('Override voting defaults')).toBeVisible();
    expect(within(section).getByLabelText('Leader')).toBeChecked();
  });
  it('writes one Markdown document with formatting and free inline placeholders', () => {
    mount(<WizardHarness step={11} />);
    fireEvent.change(screen.getByLabelText('Formal constitution'), { target: { value: 'YES' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start from a template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Markdown source' }));
    const input = screen.getByLabelText('Constitution text · EN');
    expect(input).toHaveValue(CONSTITUTION_TEMPLATE_EN);
    const markdown =
      '# Custom charter\n\nFounded by {{founders}}.\n\n- Parent\n    - Child\n\nLast line  \nNext line';
    fireEvent.change(input, { target: { value: markdown } });
    expect(input).toHaveValue(markdown);
    fireEvent.change(screen.getByLabelText('Formal constitution'), { target: { value: 'NO' } });
    fireEvent.change(screen.getByLabelText('Formal constitution'), { target: { value: 'YES' } });
    fireEvent.click(screen.getByRole('button', { name: 'Markdown source' }));
    expect(screen.getByLabelText('Constitution text · EN')).toHaveValue(markdown);
  });
  it('renders the configured majority rule rather than an unused percentage', () => {
    const configuration = emptyConfiguration();
    configuration.governance.votingDefaults.thresholdKind = 'UNANIMOUS';
    mount(<StateReview configuration={configuration} />);
    expect(screen.getByText(/Every eligible voter must approve/u)).toBeVisible();
  });
  it('renders readable review and transliterates Russian URLs', () => {
    // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- One fixed fixture render tests the readable summary.
    const configuration = {
      ...emptyConfiguration(),
      name: { en: 'Aurora' },
      governance: applyPreset('AUTOCRACY', USER),
    };
    mount(<StateReview configuration={configuration} />);
    expect(screen.getByRole('heading', { name: 'Aurora' })).toBeVisible();
    expect(screen.getAllByText('Leader').length).toBeGreaterThan(0);
    expect(screen.queryByText('SINGLE_OFFICE')).not.toBeInTheDocument();
    expect(slugify('Королевство Аврора')).toBe('korolevstvo-avrora');
  });
});

it('offers an explicit territory procedure and assigns it to an actual office', () => {
  mount(<WizardHarness step={9} />);
  const section = screen.getByRole('heading', { name: 'Change territory' }).closest('section');
  if (section === null) {
    throw new Error('Territory policy section missing');
  }
  expect(
    within(section).getByText(
      'No policy is configured. This action is denied until a reform is approved.',
    ),
  ).toBeVisible();
  expect(within(section).queryByLabelText('Who makes this decision?')).not.toBeInTheDocument();
  fireEvent.click(within(section).getByRole('button', { name: 'Configure procedure' }));
  const editor = screen.getByRole('heading', { name: 'Change territory' }).closest('section');
  if (editor === null) {
    throw new Error('Territory policy editor missing');
  }
  fireEvent.change(within(editor).getByLabelText('Who makes this decision?'), {
    target: { value: 'SINGLE_OFFICE' },
  });
  fireEvent.click(within(editor).getByLabelText('Leader'));
  expect(within(editor).getByLabelText('Leader')).toBeChecked();
});
