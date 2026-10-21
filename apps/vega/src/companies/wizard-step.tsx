import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { CompanyConfiguration, CompanyDraft, Principal } from '@helicraft/alhena';
import type { SelectedPlayer } from '../player-picker';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyIdentityFields } from './identity-fields';
import { CompanyAllocationsEditor } from './allocations-editor';
import { CompanyCharterEditor } from './charter-editor';
import { CompanyWizardReview } from './wizard-review';

const GOVERNANCE_STEP = 2;
const DOCUMENT_STEP = 3;
function CompanyWizardStep({
  step,
  configuration,
  onChange,
  players,
  principal,
  flush,
}: Readonly<{
  step: number;
  configuration: CompanyConfiguration;
  onChange: (configuration: CompanyConfiguration) => void;
  players: readonly SelectedPlayer[];
  principal: Principal;
  flush: () => Promise<CompanyDraft>;
}>): ReactElement {
  const { locale } = useTranslation();
  const charter = useCallback(
    (value: CompanyConfiguration['charter']): void => {
      onChange({ ...configuration, charter: value });
    },
    [configuration, onChange],
  );
  const document = useCallback(
    (value: CompanyConfiguration['document']): void => {
      onChange({ ...configuration, document: value });
    },
    [configuration, onChange],
  );
  if (step === 0) {
    return <CompanyIdentityFields value={configuration} onChange={onChange} />;
  }
  if (step === 1) {
    return <CompanyAllocationsEditor value={configuration} onChange={onChange} />;
  }
  if (step === GOVERNANCE_STEP) {
    return (
      <CompanyCharterEditor
        value={configuration.charter}
        actorId={principal.id}
        players={players}
        onChange={charter}
      />
    );
  }
  if (step === DOCUMENT_STEP) {
    return (
      <>
        <p>
          {uiText(
            locale,
            'Формальный Markdown-документ не изменяет машинно-читаемые полномочия.',
            'Formal Markdown text does not change machine-readable authority.',
          )}
        </p>
        <LocalizedInputField
          label={uiText(locale, 'Формальный устав', 'Formal charter')}
          value={configuration.document}
          onChange={document}
          multiline
        />
      </>
    );
  }
  return <CompanyWizardReview actorId={principal.id} flush={flush} />;
}
export { CompanyWizardStep };
