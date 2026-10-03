import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import '@helicraft/atria/styles.css';

const router = createRouter({ routeTree });
const queryClient = new QueryClient();
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const element = document.querySelector('#root');
if (!element) {
  throw new Error('Root element is missing');
}
createRoot(element).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
