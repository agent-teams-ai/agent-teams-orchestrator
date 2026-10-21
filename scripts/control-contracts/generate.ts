import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { normalizeGeneratedPreamble } from './normalize-generated.ts';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const targets = [
  { id: 'execution-observation', root: 'packages/contexts/execution-observation', feature: 'sandbox-activity', source: 'agentteams/execution_observation/v1/activity.proto' },
] as const;

const sourceModules = [
  { root: 'contracts/proto', files: ['agentteams/control/v1/control.proto'] },
  { root: `${targets[0].root}/src/features/${targets[0].feature}/contracts/control-api`, files: [targets[0].source] },
  { root: 'scripts/orchestration-specs/fixtures/desktop-first-slice-v1', files: [
    'agentteams/agent_communication/v1/conversations.proto', 'agentteams/run_orchestration/v1/runs.proto',
    'agentteams/team_topology/v1/teams.proto', 'agentteams/work_coordination/v1/tasks.proto',
  ] },
] as const;

async function inventory(root: string): Promise<string[]> {
  if (!existsSync(root)) { return []; }
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const child of await inventory(join(root, entry.name))) { files.push(`${entry.name}/${child}`); }
    } else if (entry.isFile()) { files.push(entry.name); }
    else { throw new Error('Generated output must contain regular files and directories only'); }
  }
  return files.toSorted();
}

async function equalTrees(expected: string, actual: string): Promise<boolean> {
  const expectedFiles = await inventory(expected);
  const actualFiles = await inventory(actual);
  if (JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) { return false; }
  for (const file of expectedFiles) {
    if (!(await readFile(join(expected, file))).equals(await readFile(join(actual, file)))) { return false; }
  }
  return true;
}

async function verifySources(): Promise<void> {
  const configuration: unknown = parse(await readFile(join(repository, 'buf.yaml'), 'utf8'));
  if (typeof configuration !== 'object' || configuration === null || !('modules' in configuration) ||
    JSON.stringify(configuration.modules) !== JSON.stringify(sourceModules.map(({ root }) => ({ path: root })))) {
    throw new Error('Control-contract module inventory must match its admitted sources');
  }
  for (const module of sourceModules) {
    if (JSON.stringify(await inventory(join(repository, module.root))) !== JSON.stringify([...module.files].toSorted())) {
      throw new Error(`Control-contract source inventory mismatch: ${module.root}`);
    }
  }
}

function generate(output: string, source: string | undefined): void {
  const template = {
    version: 'v2',
    plugins: [{
      local: [process.execPath, join(repository, 'node_modules/@bufbuild/protoc-gen-es/bin/protoc-gen-es')],
      out: output, opt: ['target=ts', 'import_extension=js'], include_imports: true,
    }],
  };
  const args = [join(repository, 'node_modules/@bufbuild/buf/bin/buf'), 'generate', '--template', JSON.stringify(template)];
  if (source !== undefined) { args.push('--path', source); }
  const result = spawnSync(process.execPath, args, { cwd: repository, stdio: 'inherit' });
  if (result.error !== undefined || result.status !== 0) { throw new Error('Pinned control-contract generation failed'); }
}

async function main(): Promise<void> {
  await verifySources();
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const consumerIndex = args.indexOf('--consumer');
  const selected = consumerIndex < 0 ? undefined : args[consumerIndex + 1];
  if (consumerIndex >= 0 && selected === undefined) { throw new Error('--consumer requires an exact target ID'); }
  if (selected !== undefined && !targets.some((target) => target.id === selected)) { throw new Error('Unknown generated consumer'); }
  const temporary = await mkdtemp(join(tmpdir(), 'TEST-orchestrator-wire-'));
  try {
    for (const target of targets) {
      if (selected !== undefined && target.id !== selected) { continue; }
      if (!existsSync(join(repository, target.root, 'package.json'))) {
        throw new Error('Generated consumer is not materialized');
      }
      const source = `${target.root}/src/features/${target.feature}/contracts/control-api/${target.source}`;
      if (source !== undefined && !existsSync(join(repository, source))) { throw new Error(`Canonical control source is absent for ${target.id}`); }
      const expected = join(temporary, target.id);
      const actual = join(repository, target.root, 'src/generated');
      generate(expected, source);
      for (const file of await inventory(expected)) {
        if (!file.endsWith('_pb.ts')) { throw new Error('Unexpected generated control-contract output'); }
        const path = join(expected, file);
        await writeFile(path, normalizeGeneratedPreamble(await readFile(path, 'utf8')));
      }
      if (check) {
        if (!await equalTrees(expected, actual)) { throw new Error(`Generated control-contract drift: ${target.id}`); }
      } else {
        await rm(actual, { recursive: true, force: true });
        await cp(expected, actual, { recursive: true });
      }
      process.stdout.write(`${target.id}: ${check ? 'generation verified' : 'generated'}\n`);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

await main();
