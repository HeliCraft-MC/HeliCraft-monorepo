import type { ReactElement } from 'react';
import type { GovernancePolicy, LocalizedInput, StateDetail } from '@helicraft/alhena';
import { InstitutionPolicyEditor } from '../states/institution-policy-editor';
import { IdentityFields } from './identity-fields';
import { hasLocalizedIdentity } from './model';
import type { DirectiveKind } from './model';

function DirectiveIdentity({
  kind,
  id,
  name,
  description,
  onName,
  onDescription,
  state,
  initialPolicies,
  onPolicies,
}: Readonly<{
  kind: DirectiveKind;
  id: string;
  name: LocalizedInput;
  description: LocalizedInput;
  onName: (value: LocalizedInput) => void;
  onDescription: (value: LocalizedInput) => void;
  state: StateDetail;
  initialPolicies: GovernancePolicy[];
  onPolicies: (policies: GovernancePolicy[]) => void;
}>): ReactElement {
  return (
    <>
      {hasLocalizedIdentity(kind) && (
        <IdentityFields
          name={name}
          description={description}
          onName={onName}
          onDescription={onDescription}
          currency={kind === 'CREATE_CURRENCY'}
          id={id}
        />
      )}
      {kind === 'ESTABLISH_BANK' && (
        <InstitutionPolicyEditor
          state={state}
          group="bank"
          value={initialPolicies}
          onChange={onPolicies}
        />
      )}
    </>
  );
}
export { DirectiveIdentity };
