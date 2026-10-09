import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';

async function registerWorker(): Promise<void> {
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Browsing still works if installation is unavailable (for example in private mode).
  }
}
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // oxlint-disable-next-line unicorn/prefer-top-level-await -- Installing a service worker must never delay document hydration.
  void registerWorker();
}
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
