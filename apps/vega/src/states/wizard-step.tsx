// oxlint-disable react/no-multi-comp -- The wrapper adds common step guidance to the existing step composition.
// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { ContentLanguageScope } from '../content-language-scope';
import { StateStepHelp } from './step-help';
import { STEPS } from './wizard-steps';
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { StateConfiguration } from '@helicraft/alhena';
import type { StateWizardStepProps } from './wizard-types';
import { VotingRulesEditor } from './voting-rules';
import { ConstitutionEditor } from './constitution-editor';
import { StateDraftReview } from './draft-review';
import { BasicInformationStep } from './basic-step';
import { FlagsStep } from './flags-step';
import { FoundersStep } from './founders-step';
import { CitizenshipStep } from './citizenship-step';
import { PresetStep } from './preset-step';
import { OfficesStep } from './offices-step';
import { PoliciesStep } from './policies-step';

function StateWizardContent(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders } = props;
  const handleVoting = useCallback(
    (votingDefaults: StateConfiguration['governance']['votingDefaults']): void => {
      onChange({ ...configuration, governance: { ...configuration.governance, votingDefaults } });
    },
    [configuration, onChange],
  );
  const handleConstitution = useCallback(
    (constitution: StateConfiguration['constitution']): void => {
      onChange({ ...configuration, constitution });
    },
    [configuration, onChange],
  );
  const founders = useMemo(
    () => [
      { id: principal.id, name: principal.username, type: 'PRIMARY' as const },
      ...cofounders.map((founder) => ({ ...founder, type: 'COFOUNDER' as const })),
    ],
    [principal.id, principal.username, cofounders],
  );
  switch (step) {
    case STEPS.BASICS: {
      return <BasicInformationStep {...props} />;
    }
    case STEPS.FLAGS: {
      return <FlagsStep {...props} />;
    }
    case STEPS.FOUNDERS: {
      return <FoundersStep {...props} />;
    }
    case STEPS.CITIZENSHIP: {
      return <CitizenshipStep {...props} />;
    }
    case STEPS.PRESET: {
      return <PresetStep {...props} />;
    }
    case STEPS.OFFICES:
    case STEPS.OFFICE_RULES: {
      return <OfficesStep {...props} />;
    }
    case STEPS.CITIZENSHIP_AUTHORITY:
    case STEPS.DECISIONS: {
      return <PoliciesStep {...props} />;
    }
    case STEPS.VOTING: {
      return (
        <VotingRulesEditor
          value={configuration.governance.votingDefaults}
          onChange={handleVoting}
        />
      );
    }
    case STEPS.CONSTITUTION: {
      return (
        <ConstitutionEditor
          configuration={configuration}
          onChange={handleConstitution}
          founders={founders}
        />
      );
    }
    default: {
      return <StateDraftReview configuration={configuration} founders={founders} />;
    }
  }
}
function StateWizardStep(props: StateWizardStepProps): ReactElement {
  return (
    <>
      <StateStepHelp step={props.step} />
      {[STEPS.OFFICES, STEPS.OFFICE_RULES, STEPS.CITIZENSHIP_AUTHORITY, STEPS.DECISIONS].some(
        (step) => step === props.step,
      ) ? (
        <ContentLanguageScope>
          <StateWizardContent {...props} />
        </ContentLanguageScope>
      ) : (
        <StateWizardContent {...props} />
      )}
    </>
  );
}
export { StateWizardStep };
