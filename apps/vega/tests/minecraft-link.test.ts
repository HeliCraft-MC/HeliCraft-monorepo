import { describe, expect, it } from 'vitest';
import { readMinecraftLink } from '../src/minecraft-link';

describe('Minecraft sign-in links', () => {
  it('accepts only an exact challenge and a complete possession code in the fragment', () => {
    const challenge = crypto.randomUUID();
    expect(readMinecraftLink(`#challenge=${challenge}&code=0123456789ABCDEF`)).toStrictEqual({
      challenge,
      code: '0123456789ABCDEF',
    });
    for (const fragment of [
      '',
      '#code=0123456789ABCDEF',
      '#challenge=invalid&code=0123456789ABCDEF',
      `#challenge=${challenge}&code=short`,
      `#challenge=${challenge}&code=0123456789ABCDEG`,
    ]) {
      expect(readMinecraftLink(fragment)).toBeNull();
    }
  });
});
