import { createContext, useContext } from 'react';

const DEFAULT_SERVER_NAME = 'HeliCraft';
interface SiteBranding {
  readonly serverName: string;
  readonly logoUrl: string | null;
  readonly githubUrl: string;
}
const SiteBrandingContext = createContext<SiteBranding>({
  serverName: DEFAULT_SERVER_NAME,
  logoUrl: null,
  githubUrl: '',
});
function useSiteBranding(): SiteBranding {
  return useContext(SiteBrandingContext);
}
function brandText(value: string, serverName: string): string {
  return value.replaceAll('{serverName}', serverName);
}
export { SiteBrandingContext, useSiteBranding, DEFAULT_SERVER_NAME, brandText };
