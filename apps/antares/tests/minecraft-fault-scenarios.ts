// oxlint-disable no-magic-numbers -- Real runtime fault assertions count the controlled fixture's private start/end events.
import { expect } from '@playwright/test';
import type { ProtocolConnection } from '../../../tests/minecraft/client';

interface MinecraftFaultRuntime {
  readonly admittedPlayer: () => Promise<ProtocolConnection>;
  readonly pendingPlayer: (virtualHost?: string) => Promise<ProtocolConnection>;
  readonly rejectedPlayer: () => Promise<ProtocolConnection>;
  readonly approve: (connection: ProtocolConnection) => Promise<void>;
  readonly noSession: () => Promise<void>;
  readonly eventCount: () => Promise<number>;
  readonly stopProxy: (signal: 'SIGTERM' | 'SIGKILL') => Promise<void>;
  readonly stopPaper: (signal: 'SIGTERM' | 'SIGKILL') => Promise<void>;
  readonly restartProxy: (label: string, fault?: 'FORWARDING' | 'TOKEN') => Promise<void>;
  readonly restartPaper: (label: string) => Promise<void>;
}
async function rejectBackend(runtime: MinecraftFaultRuntime, virtualHost?: string): Promise<void> {
  const player = await runtime.pendingPlayer(virtualHost);
  await runtime.approve(player);
  await player.waitFor(() => player.disconnected, 'backend admission rejected');
  await runtime.noSession();
}
async function verifyCrash(runtime: MinecraftFaultRuntime, before: number): Promise<void> {
  const active = await runtime.admittedPlayer();
  await Promise.all([runtime.stopProxy('SIGKILL'), runtime.stopPaper('SIGKILL')]);
  await active.waitFor(() => active.disconnected, 'crashed proxy disconnect');
  await runtime.noSession();
  expect(await runtime.eventCount()).toBe(before + 2);
  await runtime.restartPaper('paper-after-crash');
  await runtime.restartProxy('velocity-after-crash');
  const fresh = await runtime.pendingPlayer();
  fresh.client.end();
  await fresh.waitFor(() => fresh.disconnected, 'fresh unapproved reconnect');
  await runtime.noSession();
}
async function verifyBackendFailures(
  runtime: MinecraftFaultRuntime,
  before: number,
): Promise<void> {
  await runtime.restartProxy('velocity-wrong-forwarding', 'FORWARDING');
  await rejectBackend(runtime);
  expect(await runtime.eventCount()).toBe(before + 2);
  await runtime.restartProxy('velocity-restored-forwarding');
  await runtime.stopPaper('SIGTERM');
  await rejectBackend(runtime);
  expect(await runtime.eventCount()).toBe(before + 2);
  await runtime.restartPaper('paper-restored');
}
async function verifyCredentials(runtime: MinecraftFaultRuntime, before: number): Promise<void> {
  await runtime.restartProxy('velocity-stale-token', 'TOKEN');
  const stale = await runtime.rejectedPlayer();
  await stale.waitFor(() => stale.disconnected, 'stale service credential rejection');
  expect(stale.loginIds).toStrictEqual([]);
  await runtime.noSession();
  await runtime.restartProxy('velocity-restored-token');
  await rejectBackend(runtime, 'escape.test');
  expect(await runtime.eventCount()).toBe(before + 2);
  const recovered = await runtime.admittedPlayer();
  recovered.client.end();
  await recovered.waitFor(() => recovered.disconnected, 'recovered session disconnect');
  await runtime.noSession();
  expect(await runtime.eventCount()).toBe(before + 4);
}
async function verifyMinecraftFaults(runtime: MinecraftFaultRuntime): Promise<void> {
  const before = await runtime.eventCount();
  await verifyCrash(runtime, before);
  await verifyBackendFailures(runtime, before);
  await verifyCredentials(runtime, before);
}
export { verifyMinecraftFaults, type MinecraftFaultRuntime };
