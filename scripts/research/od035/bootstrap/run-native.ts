import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir, platform, arch } from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const candidate = process.argv[2];
if (candidate !== 'openworkflow' && candidate !== 'dbos' && candidate !== 'temporal') {
  throw new Error('Pass openworkflow, dbos, or temporal');
}
const output = resolvePath(process.env.SPIKE_OUTPUT_DIR ?? join(root, 'native-results', `${platform()}-${arch()}-${candidate}`));
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'od035-native-'));
const password = randomBytes(24).toString('hex');
const summary: Record<string, unknown> = {
  candidate, platform: platform(), architecture: arch(), node: process.version,
  startedAt: new Date().toISOString(), kind: 'native-engine-research',
  releaseQualification: false,
};

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('No loopback port'));
        return;
      }
      server.close((error) => {
        if (error !== undefined) { reject(error); }
        else { resolve(address.port); }
      });
    });
  });
}

async function execute(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) { resolve(); }
      else { reject(new Error(`${command} exited ${String(code)} (${String(signal)})`)); }
    });
  });
}

async function download(url: string, destination: string, expectedSha256?: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) { throw new Error(`Artifact download failed: ${String(response.status)} ${url}`); }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (expectedSha256 !== undefined && expectedSha256 !== digest) { throw new Error(`Artifact checksum mismatch: ${url}`); }
  await writeFile(destination, bytes);
  return digest;
}

async function temporalArtifacts(): Promise<NodeJS.ProcessEnv> {
  const supportedOs: Record<string, string> = { linux: 'linux', darwin: 'darwin', win32: 'windows' };
  const supportedArch: Record<string, string> = { x64: 'amd64', arm64: 'arm64' };
  const osName = supportedOs[platform()];
  const cpu = supportedArch[arch()];
  if (osName === undefined || cpu === undefined) { throw new Error('Unsupported native Temporal artifact tuple'); }
  const extension = platform() === 'win32' ? 'zip' : 'tar.gz';
  const filename = `temporal_1.32.1_${osName}_${cpu}.${extension}`;
  const checksumText = await readFile(join(root, 'temporal', 'checksums.txt'), 'utf8');
  const expected = checksumText.split(/\r?\n/).find((line) => line.endsWith(filename))?.split(/\s+/)[0];
  if (expected === undefined || !/^[a-f0-9]{64}$/.test(expected)) { throw new Error(`No retained checksum for ${filename}`); }
  const archive = join(temporary, filename);
  const digest = await download(`https://github.com/temporalio/temporal/releases/download/v1.32.1/${filename}`, archive, expected);
  const binaries = join(temporary, 'temporal-binaries');
  await mkdir(binaries);
  await execute('tar', ['-xf', archive, '-C', binaries], temporary);
  const sources = join(temporary, 'temporal-source.tar.gz');
  const sourceDigest = await download('https://github.com/temporalio/temporal/archive/refs/tags/v1.32.1.tar.gz', sources, '9a1766efcdc2acf03165e0304549d00930e18ff4fbf2c5abe27732fe7c04f7ee');
  await execute('tar', ['-xf', sources, '-C', temporary], temporary);
  summary.temporalArtifacts = { filename, sha256: digest, sourceArchiveSha256: sourceDigest, server: '1.32.1', sdk: '1.24.0' };
  return { TEMPORAL_BIN_DIR: binaries, TEMPORAL_SOURCE_DIR: join(temporary, 'temporal-1.32.1') };
}

const port = await availablePort();
const database = new EmbeddedPostgres({
  databaseDir: join(temporary, 'postgres'), user: 'od035', password, port,
  authMethod: 'scram-sha-256', persistent: true,
  postgresFlags: ['-h', '127.0.0.1', '-c', 'max_connections=160', '-c', 'fsync=on', '-c', 'full_page_writes=on', '-c', 'synchronous_commit=on'],
});
let started = false;
try {
  await database.initialise();
  await database.start();
  started = true;
  await database.createDatabase('workflow_spikes');
  const client = database.getPgClient();
  await client.connect();
  summary.postgres = (await client.query<{version: string; fsync: string; full_page_writes: string; synchronous_commit: string}>("SELECT version(), current_setting('fsync') AS fsync, current_setting('full_page_writes') AS full_page_writes, current_setting('synchronous_commit') AS synchronous_commit")).rows[0];
  await client.end();
  const url = `postgresql://od035:${password}@127.0.0.1:${String(port)}/workflow_spikes`;
  const configPath = join(temporary, 'pg-config.json');
  await writeFile(configPath, JSON.stringify({ host: '127.0.0.1', port, user: 'od035', password, database: 'workflow_spikes', connectionString: url }), { mode: 0o600 });
  const engineEnv = candidate === 'temporal' ? await temporalArtifacts() : {};
  const environment = {
    ...process.env, ...engineEnv, DATABASE_URL: url, SPIKE_DATABASE_URL: url,
    PG_CONFIG_PATH: configPath, SPIKE_OUTPUT_DIR: output,
  };
  const script = candidate === 'temporal' ? 'run.ts' : 'harness.ts';
  await execute(process.execPath, ['--import', 'tsx', script], join(root, candidate), environment);
  summary.outcome = 'passed';
} catch (error) {
  summary.outcome = 'failed';
  summary.error = (error instanceof Error ? error.message : 'Unknown bootstrap failure').replaceAll(password, '[redacted]');
  process.exitCode = 1;
} finally {
  if (started) {
    try { await database.stop(); summary.databaseStopped = true; }
    catch (error) { summary.databaseStopped = false; summary.cleanupError = (error instanceof Error ? error.message : 'Unknown cleanup failure').replaceAll(password, '[redacted]'); process.exitCode = 1; }
  }
  summary.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'native-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));
  if (summary.databaseStopped === true) { await rm(temporary, { recursive: true, force: true }); }
}
