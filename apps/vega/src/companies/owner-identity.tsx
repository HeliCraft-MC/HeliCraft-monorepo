import type { ReactElement } from 'react';
import type { LegalOwner } from '@helicraft/alhena';
import { MonetaryCompany } from '../monetary/company';
import { CompanyStateIdentity } from './state-identity';
import { CompanyPlayerIdentity } from './player-identity';

function CompanyOwnerIdentity({ owner }: Readonly<{ owner: LegalOwner }>): ReactElement {
  if (owner.type === 'PLAYER') {
    return <CompanyPlayerIdentity id={owner.id} />;
  }
  return owner.type === 'COMPANY' ? (
    <MonetaryCompany id={owner.id} />
  ) : (
    <CompanyStateIdentity id={owner.id} />
  );
}
export { CompanyOwnerIdentity };
