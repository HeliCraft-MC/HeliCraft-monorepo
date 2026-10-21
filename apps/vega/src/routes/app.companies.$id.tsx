import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { z } from 'zod';
import { CompanyWorkspacePage } from '../companies/workspace';
import { COMPANY_SECTIONS } from '../companies/workspace-sections';

const api = getRouteApi('/app/companies/$id');
const search = z.object({
  section: z.enum(COMPANY_SECTIONS).default('overview'),
  shareOperationId: z.uuid().optional(),
  formationDraftId: z.uuid().optional(),
  votingId: z.uuid().optional(),
});
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  const { section, shareOperationId, formationDraftId, votingId } = api.useSearch();
  return (
    <CompanyWorkspacePage
      id={id}
      actorId={principal.id}
      section={section}
      votingId={votingId}
      formationDraftId={formationDraftId}
      shareOperationId={shareOperationId}
    />
  );
}
const Route = createFileRoute('/app/companies/$id')({ validateSearch: search, component: Page });
export { Route };
