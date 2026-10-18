import { brandText, DEFAULT_SERVER_NAME } from '../site-branding';
import { loadPublicSite } from '../public-data';
import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import type { ReactElement } from 'react';
import { StateManagementPanel } from '../states/management-panel';
import { MANAGEMENT_SECTIONS } from '../states/management-sections';
import { currentAccount } from '../account-api';
import { translate } from '../locales';

const route = getRouteApi('/app_/states/$stateId/manage');
function Page(): ReactElement {
  const { stateId } = route.useParams();
  const { section } = route.useSearch();
  const { principal } = route.useRouteContext();
  return (
    <StateManagementPanel
      key={stateId}
      stateId={stateId}
      actorId={principal.id}
      section={section}
    />
  );
}
const Route = createFileRoute('/app_/states/$stateId/manage')({
  ssr: false,
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
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch supplies a search-schema default, not a Promise callback.
  validateSearch: z.object({ section: z.enum(MANAGEMENT_SECTIONS).catch('overview') }),
  component: Page,
});
export { Route };
