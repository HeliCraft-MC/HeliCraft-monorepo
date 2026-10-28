import { useEffect, useState } from 'react';
import { decideMinecraftChallenge } from '@helicraft/alhena';
import { z } from 'zod';
import type { Locale } from './locales';
import { browserClient } from './account-api';

const CLOCK_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;
function useMinecraftDeadline(expiresAt: string): { expired: boolean; remaining: string } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      setNow(Date.now());
    }, CLOCK_INTERVAL_MS);
    return (): void => {
      globalThis.clearInterval(timer);
    };
  }, []);
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / CLOCK_INTERVAL_MS));
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return {
    expired: seconds === 0,
    remaining: `${minutes}:${String(seconds % SECONDS_PER_MINUTE).padStart(CLOCK_DIGITS, '0')}`,
  };
}
type MinecraftDecision = 'APPROVE' | 'REJECT';
const DecisionError = z.object({ code: z.string().optional() });
function decisionError(error: unknown): string {
  const parsed = DecisionError.safeParse(error);
  const code = parsed.success ? parsed.data.code : undefined;
  if (code === 'MINECRAFT_CODE_REJECTED') {
    return 'minecraft.codeRejected';
  }
  if (code === 'MINECRAFT_ADMISSION_DENIED') {
    return 'minecraft.expired';
  }
  if (code === 'RATE_LIMITED') {
    return 'minecraft.rateLimited';
  }
  if (code === 'UNAUTHENTICATED') {
    return 'minecraft.signInAgain';
  }
  return 'minecraft.unavailable';
}
async function decideMinecraftSignIn({
  id,
  decision,
  code,
  locale,
}: Readonly<{
  id: string;
  decision: MinecraftDecision;
  code: string;
  locale: Locale;
}>): Promise<void> {
  await decideMinecraftChallenge({
    client: browserClient(),
    path: { id },
    body: decision === 'APPROVE' ? { code, decision, locale } : { decision },
    throwOnError: true,
  });
}
export { useMinecraftDeadline, decisionError, decideMinecraftSignIn, type MinecraftDecision };
