import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { Button } from '@helicraft/atria';
import { loadGreeting } from './api';

async function greetingQuery({
  signal,
}: QueryFunctionContext): Promise<Awaited<ReturnType<typeof loadGreeting>>> {
  return await loadGreeting(signal);
}

export function Home(): ReactElement {
  const greeting = useQuery({ queryKey: ['greeting'], queryFn: greetingQuery });
  const { refetch } = greeting;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  let message = 'Connecting to Antares…';
  if (greeting.isError) {
    message = 'Antares is unavailable. Try again.';
  } else if (greeting.isSuccess) {
    const { message: greetingMessage } = greeting.data;
    message = greetingMessage;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-8">
      <p className="text-sm uppercase tracking-[0.3em] text-sky-400">HeliCraft / Vega</p>
      <h1 className="text-5xl font-semibold">Your world. Your story.</h1>
      <p className="text-lg text-slate-300">What changed? What is happening? What can I do?</p>
      <output aria-live="polite">{message}</output>
      <div>
        <Button onClick={refresh} disabled={greeting.isFetching}>
          Refresh world
        </Button>
      </div>
    </main>
  );
}
