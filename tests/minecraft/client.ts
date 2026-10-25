import { createClient } from 'minecraft-protocol';
import type { Client } from 'minecraft-protocol';

const VERSION = '26.1';
const POLL_MS = 100;
const TIMEOUT_MS = 30_000;
interface ProtocolConnection {
  readonly client: Client;
  readonly messages: string[];
  readonly loginIds: string[];
  readonly errors: string[];
  readonly packets: string[];
  disconnected: boolean;
  readonly waitFor: (predicate: () => boolean, description: string) => Promise<void>;
}
// oxlint-disable-next-line max-lines-per-function -- One test client owns protocol evidence and bounded progress observation.
function connectMinecraft(
  username: string,
  port: number,
  virtualHost?: string,
): ProtocolConnection {
  const client = createClient({
    host: '127.0.0.1',
    port,
    username,
    auth: 'offline',
    version: VERSION,
    hideErrors: true,
    fakeHost: virtualHost,
  });
  const connection: ProtocolConnection = {
    client,
    messages: [],
    loginIds: [],
    errors: [],
    packets: [],
    disconnected: false,
    waitFor: async (predicate, description): Promise<void> => {
      const deadline = Date.now() + TIMEOUT_MS;
      while (!predicate()) {
        if (connection.disconnected) {
          throw new Error(
            `Minecraft disconnected before ${description}; ${connection.errors.join(', ')}; packets ${connection.packets.join(', ')}`,
          );
        }
        if (Date.now() > deadline) {
          throw new Error(`Minecraft timeout: ${description}; ${connection.errors.join(', ')}`);
        }
        // oxlint-disable-next-line no-await-in-loop -- Observe real protocol progress without busy waiting.
        await Bun.sleep(POLL_MS);
      }
    },
  };
  client.on('packet', (data: unknown, metadata: { readonly name: string }) => {
    if (
      metadata.name === 'system_chat' ||
      metadata.name === 'disconnect' ||
      metadata.name === 'kick_disconnect'
    ) {
      connection.messages.push(JSON.stringify(data));
    }
    if (
      metadata.name === 'success' &&
      typeof data === 'object' &&
      data !== null &&
      'uuid' in data &&
      typeof data.uuid === 'string'
    ) {
      connection.loginIds.push(data.uuid);
    }
  });
  // The pinned client leaves unused once-listeners after limbo configuration.
  // Clear them at its normal phase boundary so backend reconfiguration sends one response.
  client.on('finish_configuration', () => {
    client.removeAllListeners('select_known_packs');
    client.removeAllListeners('code_of_conduct');
  });
  client.on('error', (error: Error) => {
    connection.errors.push(error.name);
  });
  client.on('end', (reason: unknown) => {
    if (typeof reason === 'string') {
      connection.errors.push(reason);
    }
    connection.disconnected = true;
  });
  return connection;
}
export { connectMinecraft, type ProtocolConnection };
