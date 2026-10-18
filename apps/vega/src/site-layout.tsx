import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { SiteBrandingContext, DEFAULT_SERVER_NAME } from './site-branding';
import { SiteLayoutContent } from './site-layout-content';

const rootRoute = getRouteApi('__root__');

export function SiteLayout(): ReactElement {
  const navigation = rootRoute.useLoaderData();
  const branding = useMemo(
    () => ({
      serverName: navigation.site?.serverName ?? DEFAULT_SERVER_NAME,
      logoUrl: navigation.site?.logoUrl ?? null,
      githubUrl: navigation.site?.githubUrl ?? '',
    }),
    [navigation.site],
  );
  return (
    <SiteBrandingContext.Provider value={branding}>
      <SiteLayoutContent />
    </SiteBrandingContext.Provider>
  );
}
