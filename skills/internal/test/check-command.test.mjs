import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PACKAGE_URL = new URL('../package.json', import.meta.url);
const AGENTS_URL = new URL('../AGENTS.md', import.meta.url);

test('package.json declares the check script as the test suite', async () => {
  const pkg = JSON.parse(await readFile(PACKAGE_URL, 'utf8'));

  assert.equal(
    pkg.scripts?.check,
    'node --test',
    'the Factory Run check step runs `bun run check`; it must run the same suite as `test`',
  );
});

test('AGENTS.md names bun run check as the check command', async () => {
  const agents = await readFile(AGENTS_URL, 'utf8');

  assert.match(
    agents,
    /`bun run check`/,
    'AGENTS.md must name `bun run check`, because the Run brief reads the check command from it',
  );
});
