import type { ReactElement } from 'react';
import { StateName } from '../state-name';

function CompanyStateIdentity({ id }: Readonly<{ id: string }>): ReactElement {
  return <StateName id={id} />;
}
export { CompanyStateIdentity };
