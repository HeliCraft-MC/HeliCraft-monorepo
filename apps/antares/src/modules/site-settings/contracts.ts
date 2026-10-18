import { z } from '@hono/zod-openapi';

const MAX_NAME = 80;
const MAX_ADDRESS = 253;
const MAX_URL = 2048;
const SiteSettingsInput = z
  .strictObject({
    serverName: z.string().trim().min(1).max(MAX_NAME),
    minecraftAddress: z
      .string()
      .trim()
      .max(MAX_ADDRESS)
      .refine(
        (value) => value === '' || /^[a-zA-Z0-9.:[\]-]+$/u.test(value),
        'Use a server host or IP with an optional port',
      ),
    githubUrl: z.union([
      z.literal(''),
      z
        .url()
        .max(MAX_URL)
        .refine((value) => {
          const url = new URL(value);
          return (
            url.protocol === 'https:' &&
            url.hostname === 'github.com' &&
            url.username === '' &&
            url.password === ''
          );
        }, 'Use an HTTPS github.com URL'),
    ]),
  })
  .openapi('SiteSettingsInput');
const SiteSettingsSchema = SiteSettingsInput.extend({ logoUrl: z.string().nullable() }).openapi(
  'SiteSettings',
);
type SiteSettingsValue = z.infer<typeof SiteSettingsInput>;
interface SiteDefaults {
  readonly minecraftAddress?: string;
}
function defaultSettings(defaults: SiteDefaults): SiteSettingsValue {
  return {
    serverName: 'HeliCraft',
    minecraftAddress: defaults.minecraftAddress ?? '',
    githubUrl: 'https://github.com/HeliCraft-MC',
  };
}
export {
  SiteSettingsInput,
  SiteSettingsSchema,
  defaultSettings,
  type SiteSettingsValue,
  type SiteDefaults,
};
