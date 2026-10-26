import { z } from 'zod';

const MinecraftLink = z.object({
  challenge: z.uuid(),
  code: z.string().regex(/^[\dA-Fa-f]{16}$/u),
});
function readMinecraftLink(fragment: string): z.infer<typeof MinecraftLink> | null {
  const parameters = new URLSearchParams(fragment.replace(/^#/u, ''));
  const parsed = MinecraftLink.safeParse({
    challenge: parameters.get('challenge'),
    code: parameters.get('code'),
  });
  return parsed.success ? parsed.data : null;
}
export { readMinecraftLink };
