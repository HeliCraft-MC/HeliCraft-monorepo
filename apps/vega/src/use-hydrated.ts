import { useSyncExternalStore } from 'react';

function subscribe(): () => void {
  return (): void => {
    /* Hydration is the only transition. */
  };
}
function clientSnapshot(): boolean {
  return true;
}
function serverSnapshot(): boolean {
  return false;
}
function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
export { useHydrated };
