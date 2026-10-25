import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';

function parsedUrl(href: string): URL | null {
  try {
    return new URL(href, globalThis.location.href);
  } catch {
    return null;
  }
}
function modifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
function internalDestination(event: MouseEvent, origin: string): string | null {
  if (event.defaultPrevented || modifiedClick(event) || !(event.target instanceof Element)) {
    return null;
  }
  const anchor = event.target.closest('a');
  if (
    anchor === null ||
    anchor.hasAttribute('download') ||
    anchor.dataset.nativeNavigation !== undefined ||
    (anchor.target !== '' && anchor.target !== '_self')
  ) {
    return null;
  }
  const href = anchor.getAttribute('href');
  if (href === null || href === '' || href.startsWith('#')) {
    return null;
  }
  const url = parsedUrl(href);
  if (
    url === null ||
    url.origin !== origin ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    /\.[a-z0-9]+$/iu.test(url.pathname)
  ) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
function useSpaNavigation(): void {
  const router = useRouter();
  useEffect(() => {
    function navigate(event: MouseEvent): void {
      const href = internalDestination(event, globalThis.location.origin);
      if (href !== null) {
        event.preventDefault();
        void router.navigate({ href });
      }
    }
    document.addEventListener('click', navigate);
    return (): void => {
      document.removeEventListener('click', navigate);
    };
  }, [router]);
}
export { useSpaNavigation, internalDestination };
