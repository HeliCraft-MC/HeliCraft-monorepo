import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { getCspNonce } from './csp';
import { routeTree } from './routeTree.gen';

// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- Router inference registers the generated tree without a recursive annotation.
function getRouter() {
  const queryClient = new QueryClient();
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    ssr: { nonce: getCspNonce() },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

export { getRouter };
