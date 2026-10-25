import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { z } from 'zod';
import { CompanyWorkspacePage } from '../companies/workspace';
import { currentAccount } from '../account-api';
import { loadPublicSite } from '../public-data';
import { brandText, DEFAULT_SERVER_NAME } from '../site-branding';
import { translate } from '../locales';
import { COMPANY_SECTIONS } from '../companies/workspace-sections';

const api = getRouteApi('/app_/companies/$id');
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
const Route = createFileRoute('/app_/companies/$id')({
  ssr: false,
  staleTime: 30_000,
  validateSearch: search,
  component: Page,
  loader: async () => await loadPublicSite(),
  beforeLoad: async ({ location }) => {
    try {
      return { principal: await currentAccount() };
    } catch {
      throw redirect({ to: '/login', search: { returnTo: location.href } });
    }
  },
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title: brandText(
          translate('seo.account.title', match.context.locale),
          loaderData?.serverName ?? DEFAULT_SERVER_NAME,
        ),
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});
export { Route };
