const NATIVE_CLASSPATH = await Bun.file(
  new URL('../../build/minecraft/native-client-classpath.txt', import.meta.url),
).text();

const POLL_MS = 100;
const TIMEOUT_MS = 30_000;
const MAX_PACKETS = 256;
interface ProtocolConnection {
  readonly client: {
    readonly chat: (command: string) => void;
    readonly move: (x: number, y: number, z: number) => void;
    readonly end: () => void;
  };
  readonly messages: string[];
  readonly titles: string[];
  readonly positions: string[];
  readonly loginIds: string[];
  readonly errors: string[];
  readonly packets: string[];
  disconnected: boolean;
  readonly waitFor: (predicate: () => boolean, description: string) => Promise<void>;
}
function event(connection: ProtocolConnection, line: string): void {
  const value: unknown = JSON.parse(line);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    !('value' in value) ||
    typeof value.value !== 'string'
  ) {
    throw new Error('Invalid native client IPC event');
  }
  if (value.type === 'identity') {
    connection.loginIds.push(value.value);
  } else if (value.type === 'message' || value.type === 'disconnected') {
    connection.messages.push(value.value);
    if (value.type === 'disconnected') {
      connection.disconnected = true;
      connection.client.end();
    }
  } else if (value.type === 'title' || value.type === 'subtitle') {
    connection.titles.push(value.value);
  } else if (value.type === 'position') {
    connection.positions.push(value.value);
  } else if (value.type === 'error') {
    connection.errors.push(value.value);
  } else if (value.type === 'packet') {
    connection.packets.push(value.value);
    if (connection.packets.length > MAX_PACKETS) {
      connection.packets.shift();
    }
  }
}
async function consume(
  connection: ProtocolConnection,
  stream: ReadableStream<Uint8Array>,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- Read native client events in order from a private pipe.
      const next = await reader.read();
      if (next.done) {
        return;
      }
      pending += decoder.decode(next.value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) {
          event(connection, line);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
async function observeProcess(
  connection: ProtocolConnection,
  process: Readonly<{
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>;
  }>,
): Promise<void> {
  try {
    const [, stderr] = await Promise.all([
      consume(connection, process.stdout),
      new Response(process.stderr).text(),
    ]);
    if (stderr.trim()) {
      connection.errors.push('Native client process reported an error');
    }
    await process.exited;
  } catch {
    connection.errors.push('Native client event stream failed');
  } finally {
    connection.disconnected = true;
  }
}
// oxlint-disable-next-line max-lines-per-function -- A disposable connection owns its native process, command pipe and bounded evidence observation.
function connectMinecraft(
  username: string,
  port: number,
  virtualHost?: string,
): ProtocolConnection {
  const process = Bun.spawn(
    [
      'java',
      '--enable-native-access=ALL-UNNAMED',
      '-Xms32M',
      '-Xmx192M',
      '-Dorg.slf4j.simpleLogger.defaultLogLevel=off',
      '-cp',
      NATIVE_CLASSPATH,
      'io.helicraft.minecraft.NativeProtocolClient',
      username,
      String(port),
      ...(virtualHost === undefined ? [] : [virtualHost]),
    ],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
  );
  const connection: ProtocolConnection = {
    client: {
      chat: (command) => {
        if (!command.startsWith('/') || command.includes('\n')) {
          throw new Error('A single test command is required');
        }
        void process.stdin.write(`COMMAND ${command.slice(1)}\n`);
        void process.stdin.flush();
      },
      move: (x, y, z) => {
        if (![x, y, z].every((coordinate) => Number.isFinite(coordinate))) {
          throw new Error('Finite movement coordinates required');
        }
        void process.stdin.write(`MOVE ${x} ${y} ${z}\n`);
        void process.stdin.flush();
      },
      end: () => {
        void process.stdin.end();
        setTimeout(() => {
          process.kill();
        }, POLL_MS);
      },
    },
    messages: [],
    titles: [],
    positions: [],
    loginIds: [],
    errors: [],
    packets: [],
    disconnected: false,
    waitFor: async (predicate, description): Promise<void> => {
      const deadline = Date.now() + TIMEOUT_MS;
      while (!predicate()) {
        if (connection.disconnected) {
          throw new Error(
            `Native 26.3 client disconnected before ${description}; ${connection.errors.join(', ')}; packets ${connection.packets.join(', ')}`,
          );
        }
        if (Date.now() > deadline) {
          throw new Error(`Native 26.3 client timeout: ${description}`);
        }
        // oxlint-disable-next-line no-await-in-loop -- Observe real protocol progress with a bounded deadline.
        await Bun.sleep(POLL_MS);
      }
    },
  };
  void observeProcess(connection, process);
  return connection;
}
export { connectMinecraft, type ProtocolConnection };
