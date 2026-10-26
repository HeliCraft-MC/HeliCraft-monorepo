import { describe, expect, it, vi } from 'vitest';
import { connectionDetails, openGeoIP } from '../src/modules/minecraft/connection';

describe('Minecraft connection location', () => {
  it('never geolocates local, private, reserved or mapped IPv4 addresses', () => {
    const lookup = vi.fn<() => null>(() => null);
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '172.30.0.1',
      '192.168.1.1',
      '100.64.1.2',
      '::1',
      'fd12::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:192.168.1.1',
    ]) {
      expect(
        connectionDetails({ address, port: 12_345, protocol: 777, version: '26.3' }, lookup),
      ).toMatchObject({ addressKind: 'LOCAL', location: null });
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it('keeps sign-in usable when GeoIP is absent, missing or the proxy sends no metadata', async () => {
    const lookup = await openGeoIP();
    expect(
      connectionDetails(
        { address: '8.8.8.8', port: 12_345, protocol: 777, version: '26.3' },
        lookup,
      ),
    ).toMatchObject({ addressKind: 'PUBLIC', location: null });
    expect(connectionDetails(undefined, lookup)).toBeNull();
    const warning = vi.spyOn(console, 'warn').mockImplementation(vi.fn<() => void>());
    try {
      expect((await openGeoIP('/missing/helicraft-geoip.mmdb'))('8.8.8.8')).toBeNull();
      expect(warning).toHaveBeenCalledOnce();
    } finally {
      warning.mockRestore();
    }
  });
});
