import type { ReactElement } from 'react';
import type { MonetaryDirective, StateDetail } from '@helicraft/alhena';
import { TreatyDecisionContent } from '../diplomacy/decision-content';
import { PayloadSummary } from './payload-summary';

function DirectiveContent({
  directive,
  state,
  code,
}: Readonly<{ directive: MonetaryDirective; state: StateDetail; code: string }>): ReactElement {
  return (
    <>
      <PayloadSummary
        configuration={state.configuration}
        payload={directive.payload}
        code={code}
        fxDisplay={directive.fxDisplay}
      />
      {directive.treatyContent !== null && (
        <TreatyDecisionContent content={directive.treatyContent} />
      )}
    </>
  );
}
export { DirectiveContent };
