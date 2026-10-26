import { BlockList, isIP } from 'node:net';
import { open } from 'maxmind';
import type { CityResponse, Reader } from 'maxmind';
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema, SUPPORTED_LOCALES } from '../localized-content/contracts';
import type { LocalizedInput } from '../localized-content/contracts';

const MAX_PORT = 65_535;
const MAX_PROTOCOL = 2_147_483_647;
const MAX_VERSION = 64;
const ClientConnection = z.strictObject({
  address: z.union([z.ipv4(), z.ipv6()]),
  port: z.number().int().min(1).max(MAX_PORT),
  protocol: z.number().int().min(0).max(MAX_PROTOCOL),
  version: z
    .string()
    .min(1)
    .max(MAX_VERSION)
    .regex(/^[\w .+/-]+$/u),
});
const GeoLocation = z.object({
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/u)
    .nullable(),
  city: LocalizedInputSchema,
  timeZone: z.string().nullable(),
});
const ConnectionDetails = ClientConnection.extend({
  addressKind: z.enum(['LOCAL', 'PUBLIC']),
  location: GeoLocation.nullable(),
}).openapi('MinecraftConnectionDetails');
type GeoLookup = (address: string) => z.infer<typeof GeoLocation> | null;
const localAddresses = new BlockList();
// oxlint-disable no-magic-numbers -- Literal CIDR prefixes define the non-public address ranges.
for (const subnet of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  localAddresses.addSubnet(subnet[0], subnet[1], 'ipv4');
}
for (const subnet of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] as const) {
  localAddresses.addSubnet(subnet[0], subnet[1], 'ipv6');
}
// oxlint-enable no-magic-numbers
const IPV4 = 4;
function noLocation(): null {
  return null;
}
function connectionDetails(
  client: z.infer<typeof ClientConnection> | undefined,
  lookup: GeoLookup,
): z.infer<typeof ConnectionDetails> | null {
  if (client === undefined) {
    return null;
  }
  const local = localAddresses.check(
    client.address,
    isIP(client.address) === IPV4 ? 'ipv4' : 'ipv6',
  );
  return {
    ...client,
    addressKind: local ? 'LOCAL' : 'PUBLIC',
    location: local ? null : lookup(client.address),
  };
}
function findLocation(reader: Reader<CityResponse>, address: string): ReturnType<GeoLookup> {
  try {
    const result = reader.get(address);
    if (result === null) {
      return null;
    }
    const city: LocalizedInput = {};
    for (const locale of SUPPORTED_LOCALES) {
      const name = result.city?.names[locale];
      if (name !== undefined) {
        city[locale] = name;
      }
    }
    return {
      countryCode: result.country?.iso_code ?? null,
      city,
      timeZone: result.location?.time_zone ?? null,
    };
  } catch {
    return null;
  }
}
async function openGeoIP(databasePath?: string): Promise<GeoLookup> {
  if (databasePath === undefined) {
    return noLocation;
  }
  try {
    const reader = await open<CityResponse>(databasePath);
    return (address): ReturnType<GeoLookup> => findLocation(reader, address);
  } catch {
    console.warn('Local GeoIP database unavailable; Minecraft sign-in continues without location.');
    return noLocation;
  }
}
export {
  ClientConnection,
  ConnectionDetails,
  GeoLocation,
  connectionDetails,
  openGeoIP,
  noLocation,
  type GeoLookup,
};
