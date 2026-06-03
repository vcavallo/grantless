import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE_FILE = path.resolve(here, '../../relay/docker-compose.yml');
const PORT = process.env.RELAY_PORT ?? '7787';

/** WebSocket URL of the local test relay. Override the port via RELAY_PORT. */
export const RELAY_URL = `ws://127.0.0.1:${PORT}`;

function compose(args: string[], opts: { quiet?: boolean } = {}): void {
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
    stdio: opts.quiet ? 'ignore' : 'inherit',
    env: { ...process.env, RELAY_PORT: PORT },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Start the local strfry relay and wait until it accepts a query. */
export async function relayUp(): Promise<void> {
  compose(['down', '-v'], { quiet: true }); // clear any leftover from a prior run
  compose(['up', '-d']);
  for (let i = 0; i < 30; i++) {
    try {
      execFileSync('nak', ['req', '-k', '1', '-l', '1', RELAY_URL], {
        stdio: 'ignore',
        timeout: 3000,
      });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`relay did not become ready at ${RELAY_URL}`);
}

/** Stop the relay and remove its (tmpfs) data. */
export async function relayDown(): Promise<void> {
  compose(['down', '-v'], { quiet: true });
}
