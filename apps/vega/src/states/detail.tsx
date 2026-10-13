import type { ReactElement, ReactNode } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { PublicStateDetail } from './public-detail';

function StateDetailView({
  state,
  publicView = false,
  flagUrl,
  children,
  backHref,
  backLabel,
}: Readonly<{
  state: StateDetail;
  publicView?: boolean;
  flagUrl?: string;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
}>): ReactElement {
  return (
    <PublicStateDetail
      state={state}
      publicView={publicView}
      backHref={backHref}
      backLabel={backLabel}
      flagUrl={publicView ? undefined : (flagUrl ?? `/api/v1/account/states/${state.id}/flag`)}
    >
      {children}
    </PublicStateDetail>
  );
}
export { StateDetailView };
