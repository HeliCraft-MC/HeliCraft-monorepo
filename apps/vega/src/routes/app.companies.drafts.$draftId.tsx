import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyDraftPage } from '../companies/draft-page';

const api = getRouteApi('/app/companies/drafts/$draftId');
function Page(): ReactElement {
  const { draftId } = api.useParams();
  const { principal } = api.useRouteContext();
  return <CompanyDraftPage id={draftId} principal={principal} />;
}
const Route = createFileRoute('/app/companies/drafts/$draftId')({ component: Page });
export { Route };
