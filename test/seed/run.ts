import { execFileSync } from 'node:child_process';
import { runSeed } from './seed';
import { formatRoster } from './accounts';

// CLI entry for `npm run seed` (run via vite-node, which resolves the @ alias).
// Waits for the local relay, seeds it, then prints the account roster so a
// developer can paste an nsec into the signer.

const RELAY = process.env.SEED_RELAY_URL ?? process.env.RELAY_URL ?? 'ws://127.0.0.1:7787';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForRelay(url: string, attempts = 40): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      execFileSync('nak', ['req', '-k', '1', '-l', '1', url], { stdio: 'ignore', timeout: 3000 });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`relay not reachable at ${url} — is it up? (npm run relay:up)`);
}

async function main(): Promise<void> {
  console.log(`Seeding Grantless dev data → ${RELAY}`);
  await waitForRelay(RELAY);
  const summary = await runSeed(RELAY);
  console.log(
    `Seeded: ${summary.profiles} profiles, ${summary.curationLists} curation lists, ` +
      `${summary.arbiters} arbiters, ${summary.tasks.length} projects ` +
      `(${summary.tasks.map((t) => t.status).join(', ')}), ` +
      `${summary.goals} goals, ${summary.receipts} zap receipts, ${summary.conclusions} conclusions.`,
  );
  console.log('');
  console.log(formatRoster());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
