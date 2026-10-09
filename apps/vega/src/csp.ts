import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

const getCspNonce = createIsomorphicFn()
  .server((): string | undefined => getRequest().headers.get('x-helicraft-csp-nonce') ?? undefined)
  .client(
    (): string | undefined =>
      document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content,
  );

export { getCspNonce };
