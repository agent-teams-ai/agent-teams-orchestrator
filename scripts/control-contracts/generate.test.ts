import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const owner = 'packages/contexts/execution-observation';
const common = 'contracts/proto/agentteams/control/v1/control.proto';
const generated = `${owner}/src/generated/agentteams/control/v1/control_pb.ts`;

test('mandatory wire route retains actual compilation, generation, Buf checks and admitted module inventory', async () => {
  const manifest = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.equal(manifest.scripts['wire:check'], 'tsc --project scripts/control-contracts/tsconfig.json --noEmit && node scripts/control-contracts/generate.ts --check && tsc --project packages/contexts/execution-observation/tsconfig.json --noEmit && buf build && buf lint && buf format --diff --exit-code');
  for (const entry of ['check', 'check:fast']) {
    assert.ok(manifest.scripts[entry]?.split(' && ').includes('pnpm wire:check'));
  }
  assert.deepEqual(parse(await readFile(join(repository, 'buf.yaml'), 'utf8')), {
    version: 'v2', modules: [{ path: 'contracts/proto' }, { path: `${owner}/src/features/sandbox-activity/contracts/control-api` },
      { path: 'scripts/orchestration-specs/fixtures/desktop-first-slice-v1' }],
    lint: { use: ['STANDARD'], except: ['RPC_REQUEST_RESPONSE_UNIQUE', 'RPC_REQUEST_STANDARD_NAME', 'RPC_RESPONSE_STANDARD_NAME'] },
    breaking: { use: ['FILE'] },
  });
});

test('wire gate verifies actual generated imports and rejects malformed, missing, unlisted and drifting inputs', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'TEST-observation-wire-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['buf.yaml', 'contracts', 'scripts/control-contracts',
    'scripts/orchestration-specs/fixtures/desktop-first-slice-v1', `${owner}/package.json`,
    `${owner}/src/features/sandbox-activity/contracts`, `${owner}/src/generated`]) {
    await cp(join(repository, path), join(root, path), { recursive: true });
  }
  await symlink(join(repository, 'node_modules'), join(root, 'node_modules'), 'dir');
  const inspect = () => spawnSync(process.execPath, [join(root, 'scripts/control-contracts/generate.ts'), '--check'],
    { cwd: root, encoding: 'utf8', timeout: 30_000 });
  const baseline = inspect();
  assert.equal(baseline.error, undefined);
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  assert.match(baseline.stdout, /execution-observation: generation verified/u);
  const original = await readFile(join(root, common), 'utf8');
  await writeFile(join(root, common), `${original}\nmessage NewUnadmittedMessage {}\n`);
  assert.match(inspect().stderr, /Generated control-contract drift/u);
  await writeFile(join(root, common), 'this is malformed protobuf');
  assert.match(inspect().stderr, /Pinned control-contract generation failed/u);
  await rm(join(root, common));
  assert.match(inspect().stderr, /source inventory mismatch/u);
  await writeFile(join(root, common), original);
  const unlisted = join(root, dirname(common), 'unlisted.proto');
  await writeFile(unlisted, 'syntax = "proto3"; package unlisted; message Extra {}\n');
  assert.match(inspect().stderr, /source inventory mismatch/u);
  await rm(unlisted);
  const manifest = join(root, owner, 'package.json');
  await rename(manifest, `${manifest}.missing`);
  assert.match(inspect().stderr, /Generated consumer is not materialized/u);
  await rename(`${manifest}.missing`, manifest);
  const generatedSource = await readFile(join(root, generated), 'utf8');
  const directive = ['/* eslint', 'disable */'].join('-');
  assert.equal(generatedSource.includes(directive), false);
  const lines = generatedSource.split('\n');
  lines.splice(2, 0, directive);
  await writeFile(join(root, generated), lines.join('\n'));
  assert.match(inspect().stderr, /Generated control-contract drift/u);
  const audit = spawnSync(process.execPath, [join(repository, 'scripts/lint/validate-suppressions.mjs'), join(root, generated)], { encoding: 'utf8' });
  assert.equal(audit.status, 1);
  assert.match(audit.stderr, /eslint suppression directives are disabled/u);
  await writeFile(join(root, generated), generatedSource);
  await rename(join(root, generated), join(root, `${generated}.js`));
  assert.match(inspect().stderr, /Generated control-contract drift/u);
});
