import type { ReactElement } from 'react';
import type { StateConfiguration, StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { StateReview } from './review';
import { ConstitutionPreview } from './constitution-preview';
import { useConstitutionPreview } from './use-constitution-preview';

function StateDraftReview({
  configuration,
  founders,
}: Readonly<{
  configuration: StateConfiguration;
  founders: StateDetail['founders'];
}>): ReactElement {
  const { locale } = useTranslation();
  const preview = useConstitutionPreview(configuration, locale);
  return (
    <>
      <StateReview configuration={configuration} founders={founders} showConstitution={false} />
      {configuration.constitution !== null && (
        <ConstitutionPreview preview={preview} locale={locale} />
      )}
    </>
  );
}
export { StateDraftReview };
