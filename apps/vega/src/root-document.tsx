import { LocaleProvider } from './locale-provider';
import { HeadContent, Scripts, useRouteContext } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import '@helicraft/atria/styles.scss';
import '@fontsource-variable/onest/index.css';
import '@fontsource/ibm-plex-mono/400.css';

export function RootDocument({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  const { queryClient, locale } = useRouteContext({ from: '__root__' });
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </LocaleProvider>
        <Scripts />
      </body>
    </html>
  );
}
