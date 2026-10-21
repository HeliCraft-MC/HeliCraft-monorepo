import { useEffect, useState } from 'react';

const CLOCK_INTERVAL_MS = 1000;
function useExpired(expiresAt: string | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      setNow(Date.now());
    }, CLOCK_INTERVAL_MS);
    return (): void => {
      globalThis.clearInterval(timer);
    };
  }, []);
  return expiresAt !== undefined && new Date(expiresAt).getTime() <= now;
}
export { useExpired };
