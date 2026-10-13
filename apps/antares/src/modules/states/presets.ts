import type { Governance, Office } from './contracts';
import { emptyConfiguration, REQUIRED_ACTIONS } from './domain';

const DEFAULT_TERM_DAYS = 90;
const COUNCIL_SEATS = 5;
const PRESETS = [
  'AUTOCRACY',
  'CONSTITUTIONAL_MONARCHY',
  'PRESIDENTIAL_REPUBLIC',
  'COUNCIL_REPUBLIC',
  'DIRECT_DEMOCRACY',
  'CUSTOM',
] as const;
type Preset = (typeof PRESETS)[number];
function presetOffice(
  name: Readonly<{ english: string; russian: string }>,
  founderId: string,
  options: Readonly<{ elected: boolean; maxHolders: number }>,
): Office {
  return {
    id: crypto.randomUUID(),
    name: { en: name.english, ru: name.russian },
    description: {},
    isHeadOfState: true,
    maxHolders: options.maxHolders,
    required: true,
    initialHolderIds: [founderId],
    appointment: options.elected ? 'CITIZEN_VOTE' : 'MANUAL_PROCEDURE',
    appointingOfficeId: null,
    term: options.elected ? 'FIXED_TERM' : 'INDEFINITE',
    termDays: options.elected ? DEFAULT_TERM_DAYS : null,
    vacancy: options.elected ? 'ELECTION' : 'MANUAL',
    inactivityDays: null,
  };
}
function applyPreset(preset: Preset, founderId: string): Governance {
  const { governance } = emptyConfiguration();
  governance.createdFromPreset = preset;
  if (preset === 'CUSTOM') {
    governance.policies = REQUIRED_ACTIONS.map((action) => ({
      action,
      mechanism: 'CITIZEN_VOTE',
      officeIds: [],
      vote: null,
      manualProcedure: {},
    }));
    return governance;
  }
  const names: Record<Exclude<Preset, 'CUSTOM' | 'DIRECT_DEMOCRACY'>, readonly [string, string]> = {
    AUTOCRACY: ['Leader', 'Правитель'],
    CONSTITUTIONAL_MONARCHY: ['Monarch', 'Монарх'],
    PRESIDENTIAL_REPUBLIC: ['President', 'Президент'],
    COUNCIL_REPUBLIC: ['Council member', 'Член совета'],
  };
  if (preset !== 'DIRECT_DEMOCRACY') {
    const [name, russian] = names[preset];
    governance.offices = [
      presetOffice({ english: name, russian }, founderId, {
        elected: preset === 'PRESIDENTIAL_REPUBLIC' || preset === 'COUNCIL_REPUBLIC',
        maxHolders: preset === 'COUNCIL_REPUBLIC' ? COUNCIL_SEATS : 1,
      }),
    ];
  }
  governance.policies = REQUIRED_ACTIONS.map((action) => {
    let mechanism: Governance['policies'][number]['mechanism'] = 'SINGLE_OFFICE';
    if (preset === 'DIRECT_DEMOCRACY') {
      mechanism = 'CITIZEN_VOTE';
    }
    if (preset === 'COUNCIL_REPUBLIC') {
      mechanism = 'COUNCIL_VOTE';
    }
    if (preset === 'CONSTITUTIONAL_MONARCHY' && action === 'AMEND_GOVERNANCE') {
      mechanism = 'COMBINED';
    }
    return {
      action,
      mechanism,
      officeIds: governance.offices.map((office) => office.id),
      vote: null,
      manualProcedure: {},
    };
  });
  return governance;
}
export { PRESETS, applyPreset, type Preset };
