import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MinecraftChallenge } from '@helicraft/alhena';
import { MinecraftChallengeForm } from '../src/minecraft-challenge';
import type { MinecraftDecision } from '../src/minecraft-challenge-model';
import { LocaleProvider } from '../src/locale-provider';

const CODE = '0123456789ABCDEF';
function challenge(expired = false): MinecraftChallenge {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    username: 'Player',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (expired ? -1000 : 120_000)).toISOString(),
    status: 'WAITING_AUTH',
    connection: {
      address: '127.0.0.1',
      port: 25_575,
      protocol: 777,
      version: '26.3',
      addressKind: 'LOCAL',
      location: null,
    },
  };
}
function mount(
  linkCode?: string,
  expired = false,
): ReturnType<typeof vi.fn<(decision: MinecraftDecision) => Promise<void>>> {
  const decided = vi.fn<(decision: MinecraftDecision) => Promise<void>>().mockResolvedValue();
  render(
    <LocaleProvider locale="en">
      <MinecraftChallengeForm
        challenge={challenge(expired)}
        onDecided={decided}
        linkCode={linkCode}
      />
    </LocaleProvider>,
  );
  return decided;
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('Minecraft sign-in confirmation', () => {
  it('waits for an explicit decision and sends the link code and chosen language only on approval', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(challenge()));
    const decided = mount(CODE);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' }));
    await waitFor(() => {
      expect(decided).toHaveBeenCalledWith('APPROVE');
    });
    const request = fetch.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) {
      throw new TypeError('Expected a request');
    }
    expect(await request.json()).toEqual({ code: CODE, decision: 'APPROVE', locale: 'en' });
    expect(request.url).toContain(`/account/minecraft/challenges/${challenge().id}/decision`);
    expect(request.url).not.toContain(CODE);
    expect(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' })).toBeDisabled();
  });
  it('allows rejection without entering a possession code', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(challenge()));
    const decided = mount();
    await userEvent.click(screen.getByRole('button', { name: 'Reject sign-in' }));
    await waitFor(() => {
      expect(decided).toHaveBeenCalledWith('REJECT');
    });
    const request = fetch.mock.calls[0]?.[0];
    if (!(request instanceof Request)) {
      throw new TypeError('Expected a request');
    }
    expect(await request.json()).toEqual({ decision: 'REJECT' });
  });
  it('keeps an invalid code editable and shows the server error without closing the request', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ code: 'MINECRAFT_CODE_REJECTED' }, { status: 403 }));
    const decided = mount();
    await userEvent.type(screen.getByRole('textbox', { name: 'Code from Minecraft' }), CODE);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' }));
    expect(
      await screen.findByText(
        'The code does not match your Minecraft client. Check all 16 characters.',
      ),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(decided).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Code from Minecraft' })).toHaveValue(CODE);
    expect(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' })).toBeEnabled();
  });
  it('disables both decisions for an expired request', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(challenge()));
    mount(CODE, true);
    expect(screen.getByText('Request expired')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject sign-in' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Minecraft sign-in' }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
