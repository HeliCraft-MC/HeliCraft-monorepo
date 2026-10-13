import type { Dispatch, SetStateAction } from 'react';
import type { StateConfiguration, Principal } from '@helicraft/alhena';
import type { SelectedPlayer } from '../player-picker';

interface StateWizardStepProps {
  readonly step: number;
  readonly stableSlug?: boolean;
  readonly onStepChange?: (step: number) => void;
  readonly configuration: StateConfiguration;
  readonly onChange: Dispatch<SetStateAction<StateConfiguration>>;
  readonly principal: Principal;
  readonly cofounders: SelectedPlayer[];
  readonly setCofounders: (players: SelectedPlayer[]) => void;
}
export { type StateWizardStepProps };
