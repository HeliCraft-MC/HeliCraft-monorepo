import { lookupPlayers } from '@helicraft/alhena';
import { browserClient } from '../account-api';
import type { SelectedPlayer } from '../player-picker';

const LOOKUP_BATCH = 100;
async function lookupCorporatePlayers(ids: readonly string[]): Promise<SelectedPlayer[]> {
  const unique = [...new Set(ids)];
  const players: SelectedPlayer[] = [];
  for (let offset = 0; offset < unique.length; offset += LOOKUP_BATCH) {
    // oxlint-disable-next-line no-await-in-loop -- The existing player directory accepts at most 100 actual identities per request; corporate office rosters can be larger.
    const result = await lookupPlayers({
      client: browserClient(),
      body: { ids: unique.slice(offset, offset + LOOKUP_BATCH) },
      throwOnError: true,
    });
    players.push(...result.data.items);
  }
  return players;
}
export { lookupCorporatePlayers };
