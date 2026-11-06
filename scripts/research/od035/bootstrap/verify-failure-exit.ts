import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = await mkdtemp(join(tmpdir(), 'od035-exit-control-'));
try {
  const bootstrap = join(dirname(fileURLToPath(import.meta.url)), 'run-native.ts');
  const child = spawnSync(process.execPath, ['--import', 'tsx', bootstrap, 'dbos'], {
    env: { ...process.env, SPIKE_OUTPUT_DIR: output, OD035_RESEARCH_FORCE_BOOTSTRAP_FAILURE: '1' },
    encoding: 'utf8', timeout: 30_000,
  });
  if (child.error !== undefined) { throw child.error; }
  assert.equal(child.status, 1, `Bootstrap failure must exit 1. ${child.stdout} ${child.stderr}`);
  const summary: unknown = JSON.parse(await readFile(join(output, 'native-summary.json'), 'utf8'));
  assert.ok(typeof summary === 'object' && summary !== null && 'outcome' in summary && summary.outcome === 'failed');
  assert.ok('error' in summary && typeof summary.error === 'string' && summary.error.includes('intentional-bootstrap-failure'));
  console.log('PASS intentional bootstrap failure preserves exit status 1 and failure evidence');
} finally {
  await rm(output, { recursive: true, force: true });
}
