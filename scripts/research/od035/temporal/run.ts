import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, openSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { Connection, Client } from '@temporalio/client';
import Long from 'long';
import { pg, initialize, nativeBinary, dbName, visibilityDbName } from './initialize.ts';
import * as business from './business.ts';
import { output, sourceDir } from './paths.ts';

const namespace = 'od035';
const prefix = `t${Date.now()}`;
const processes = new Set<ChildProcess>();
const scenarios: Record<string, unknown> = {};
const result: Record<string, unknown> = { engine: 'Temporal full server', serverVersion: '1.32.1', sdkVersion: '1.24.0', node: process.version, platform: process.platform, arch: process.arch, startedAt: new Date().toISOString(), scenarios };
let connection: Connection | undefined;
let client: Client;
let service: ChildProcess;
let runtimeUrl = pg.connectionString;

function record(name: string, evidence: unknown): void {
  scenarios[name] = evidence;
  writeFileSync(output('results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ scenario: name, evidence }));
}

async function until(predicate: () => Promise<boolean> | boolean, label: string, timeout = 30000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await predicate()) {return;} await delay(100); }
  throw new Error(`Timed out: ${label}`);
}

function launch(program: string, args: string[], log: string, env: Record<string, string> = {}): ChildProcess {
  const fd = openSync(output(log), 'w');
  const child = spawn(program, args, { cwd: sourceDir, env: { ...process.env, DATABASE_URL: runtimeUrl, ...env }, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  processes.add(child);
  child.once('exit', () => { processes.delete(child); });
  return child;
}

async function kill(child: ChildProcess, signal: NodeJS.Signals = 'SIGKILL'): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {return;}
  const exited = new Promise<void>(resolve => { child.once('exit', () => { resolve(); }); });
  child.kill(signal);
  await exited;
}

async function startServer(): Promise<number> {
  const start = Date.now();
  service = launch(nativeBinary('temporal-server'), ['--config-file', output('server-config.private.json'), '--allow-no-auth', 'start'], 'server.log');
  await until(async () => {
    try {
      const conn = await Connection.connect({ address: '127.0.0.1:27233', connectTimeout: '500ms' });
      await conn.workflowService.getSystemInfo({});
      await conn.close();
      return true;
    } catch { return false; }
  }, 'full native server health', 60000);
  return Date.now() - start;
}

async function startWorker(version = 'v1', queue = 'od035-temporal', env: Record<string, string> = {}): Promise<ChildProcess> {
  const log = `worker-${prefix}-${queue}-${version}-${Date.now()}.log`;
  const worker = launch(process.execPath, ['--import', 'tsx', 'worker.ts'], log, { WORKFLOW_VERSION: version, TASK_QUEUE: queue, ...env });
  await until(() => existsSync(output(log)) && readFileSync(output(log), 'utf8').includes('"ready":true'), `worker ready ${version}`, 30000);
  return worker;
}

function rssKb(pid: number | undefined): number | null {
  if (pid === undefined || process.platform !== 'linux') {return null;}
  const line = readFileSync(`/proc/${pid}/status`, 'utf8').match(/^VmRSS:\s+(\d+)/m);
  return line ? Number(line[1]) : null;
}

async function startActivation(id: string, queue = 'od035-temporal', beforeWaitMs = 0) {
  await business.createRun(id);
  return client.workflow.start<(input: { id: string; beforeWaitMs: number }) => Promise<string>>('activation', { workflowId: id, taskQueue: queue, args: [{ id, beforeWaitMs }], workflowTaskTimeout: '5s' });
}

async function approve(id: string): Promise<void> {
  await business.approve(id, `approval:${id}`);
  await client.workflow.getHandle(id).signal('approval');
}

async function awaitInitialRead(id: string): Promise<void> {
  await until(async () => (await client.workflow.getHandle(id).fetchHistory()).events?.some(event => !!event.activityTaskCompletedEventAttributes) ?? false, `initial application read for ${id}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasCode(value: unknown, code: string | number): boolean {
  return isRecord(value) && value.code === code;
}

function replaceCredentials(value: unknown, user: string, password: string): unknown {
  if (!isRecord(value) || !isRecord(value.persistence) || !isRecord(value.persistence.datastores)) {
    throw new Error('Invalid server config persistence shape');
  }
  for (const datastore of Object.values(value.persistence.datastores)) {
    if (!isRecord(datastore) || !isRecord(datastore.sql)) { throw new Error('Invalid server config SQL shape'); }
    datastore.sql.user = user; datastore.sql.password = password;
  }
  return value;
}

async function restrictRuntimeRole(): Promise<void> {
  const role = 'temporal_spike_runtime';
  const password = randomBytes(24).toString('hex');
  const exists = await business.pool.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
  if (exists.rowCount === 0) {await business.pool.query(`CREATE ROLE ${role} LOGIN`);}
  await business.pool.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
  for (const name of [dbName, visibilityDbName]) {
    const url = new URL(pg.connectionString); url.pathname = `/${name}`;
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`GRANT CONNECT ON DATABASE ${name} TO ${role};
      GRANT USAGE ON SCHEMA public TO ${role};
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${role};
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role};`);
    await admin.end();
  }
  await business.pool.query(`GRANT CONNECT ON DATABASE ${pg.database} TO ${role};
    GRANT USAGE ON SCHEMA temporal_spike_business TO ${role};
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA temporal_spike_business TO ${role};`);
  const runtime = new URL(pg.connectionString); runtime.username = role; runtime.password = password;
  runtimeUrl = runtime.toString();
  const parsedConfig: unknown = JSON.parse(readFileSync(output('server-config.private.json'), 'utf8'));
  const config = replaceCredentials(parsedConfig, role, password);
  writeFileSync(output('server-config.private.json'), JSON.stringify(config, null, 2), { mode: 0o600 });
  const limited = new Pool({ connectionString: runtimeUrl, max: 1 });
  let denied = false;
  try { await limited.query('CREATE TABLE temporal_spike_business.forbidden_ddl(id int)'); }
  catch (error) { denied = hasCode(error, '42501'); }
  await limited.end();
  if (!denied) {throw new Error('runtime DDL was not denied');}
  record('leastPrivilegeRuntime', { pass: true, role, createTableDenied: true,
    migrationAuthority: 'Separate driver/admin invoked matching temporal-sql-tool before service/Worker startup; runtime has DML and schema USAGE only.' });
}

async function main(): Promise<void> {
  await initialize();
  process.env.DATABASE_URL = pg.connectionString;
  // Business Pool is created during import; supply the isolated connection explicitly.
  business.pool.options.connectionString = pg.connectionString;
  await business.migrate();
  await restrictRuntimeRole();
  const coldStartMs = await startServer();
  connection = await Connection.connect({ address: '127.0.0.1:27233' });
  try { await connection.workflowService.registerNamespace({ namespace, workflowExecutionRetentionPeriod: { seconds: Long.fromNumber(86400) } }); }
  catch (error) { if (!hasCode(error, 6)) {throw error;} }
  client = new Client({ connection, namespace });
  let worker = await startWorker();
  record('resourceSnapshot', { coldStartToGrpcMs: coldStartMs, serverPid: service.pid, workerPid: worker.pid, serverRssKb: rssKb(service.pid), workerRssKb: rssKb(worker.pid), databaseExcluded: true, methodology: 'One cold process launch after schemas were migrated and PostgreSQL was already running; /proc/PID/status VmRSS immediately after Worker ready. No benchmark claim.' });

  await approvalScenarios();
  if (process.env.TEMPORAL_SMOKE_ONLY === '1') {
    result.smokeOnly = true;
    finish();
    return;
  }
  await waitingScenario();
  worker = await crashAndTimerScenarios(worker);
  await upgradeAndCancellationScenarios(worker);
  await staleScenario();
  finish();
}

function finish(): void {
  result.completedAt = new Date().toISOString();
  result.allExecutedScenariosPassed = true;
  writeFileSync(output('results.json'), JSON.stringify(result, null, 2));
}

async function approvalScenarios(): Promise<void> {
  const early = `${prefix}-early`;
  const earlyHandle = await startActivation(early, undefined, 2500);
  await approve(early);
  await business.approve(early, `approval:${early}`);
  await earlyHandle.signal('approval');
  const earlyResult = await earlyHandle.result();
  const earlyState = await business.readState(early);
  if (earlyResult !== 'active' || earlyState.effects !== 1) {throw new Error('early/duplicate approval invariant');}
  record('earlyAndDuplicateApproval', { pass: true, result: earlyResult, ...await business.evidence(early) });
  const noWake = `${prefix}-approval-no-wake`;
  const noWakeHandle = await startActivation(noWake);
  await awaitInitialRead(noWake);
  await business.approve(noWake, `approval:${noWake}`);
  const noWakeResult = await noWakeHandle.result();
  if (noWakeResult !== 'active') { throw new Error('Approval without wake did not recover'); }
  record('approvalCommitWithoutSignal', { pass: true, result: noWakeResult,
    mechanism: 'The adapter has a supported durable two-second Temporal timer around authoritative feature-state rereads. A production outbox remains the normal reliable wake delivery path.', ...await business.evidence(noWake) });
}

async function waitingScenario(): Promise<void> {
  const waiters = Array.from({ length: 80 }, (_, index) => `${prefix}-waiting-${index}`);
  const waitingHandles = [];
  for (const id of waiters) {waitingHandles.push(await startActivation(id));}
  await Promise.all(waiters.map(awaitInitialRead));
  const controlStarted = Date.now();
  const firstId = waiters[0]; const firstHandle = waitingHandles[0];
  if (firstId === undefined || firstHandle === undefined) { throw new Error('Waiting fixture empty'); }
  await business.cancel(firstId);
  await firstHandle.cancel();
  const cancelLatencyMs = Date.now() - controlStarted;
  const controlId = `${prefix}-control-under-waits`;
  const controlHandle = await startActivation(controlId);
  await approve(controlId);
  await controlHandle.result();
  const controlCompletionMs = Date.now() - controlStarted;
  const connections = await business.pool.query("SELECT datname,count(*)::int AS count FROM pg_stat_activity WHERE usename='temporal_spike_runtime' GROUP BY datname ORDER BY datname");
  for (const handle of waitingHandles.slice(1)) {await handle.cancel();}
  if (cancelLatencyMs > 3000 || controlCompletionMs > 5000) {throw new Error('waiting workflow control starvation');}
  record('boundedWorkersWith80DurableWaits', { pass: true, waitingWorkflows: 80, workflowTaskExecutionConcurrency: 4,
    activityTaskExecutionConcurrency: 4, businessPoolMaxPerWorker: 4,
    serverPoolMaxPerService: { default: 8, visibility: 2 }, observedConnectionsByDatabase: connections.rows,
    cancelLatencyMs, controlCompletionMs, limitation: 'One Linux x64 process/sample; no large-scale throughput claim. Workflow task slots are released across durable waits.' });

}

async function crashAndTimerScenarios(initialWorker: ChildProcess): Promise<ChildProcess> {
  let worker = initialWorker;
  await kill(worker);
  const crash = `${prefix}-crash`;
  worker = await startWorker('v1', 'od035-temporal', { CRASH_AFTER_COMMIT_RUN: crash });
  const crashHandle = await startActivation(crash);
  await approve(crash);
  await until(() => existsSync(output(`committed-${crash}.json`)), 'business COMMIT before worker SIGKILL');
  await until(() => worker.exitCode !== null || worker.signalCode !== null, 'worker terminated abruptly');
  const workerExit = { exitCode: worker.exitCode, signalCode: worker.signalCode };
  const afterCrash = await business.evidence(crash);
  worker = await startWorker();
  const crashResult = await crashHandle.result();
  const crashEvidence = await business.evidence(crash);
  if (crashResult !== 'active' || crashEvidence.state.effects !== 1 || crashEvidence.attempts.length < 2) {throw new Error('commit-gap receipt invariant');}
  const crashMarker: unknown = JSON.parse(readFileSync(output(`committed-${crash}.json`), 'utf8'));
  record('workerSigkillAfterBusinessCommitBeforeEngineCheckpoint', { pass: true, crashMarker, workerExit, afterCrash, recovered: crashEvidence });

  const timer = `${prefix}-timer`;
  await business.createRun(timer);
  const timerStarted = Date.now();
  const timerHandle = await client.workflow.start<(input: { id: string; ms: number }) => Promise<string>>('durableTimer', { workflowId: timer, taskQueue: 'od035-temporal', args: [{ id: timer, ms: 5000 }] });
  await until(async () => (await timerHandle.fetchHistory()).events?.some(event => !!event.timerStartedEventAttributes) ?? false, 'timer persisted');
  await kill(worker);
  await kill(service);
  await delay(1500);
  const restartMs = await startServer();
  worker = await startWorker();
  const timerResult = await timerHandle.result();
  const timerHistory = await timerHandle.fetchHistory();
  const timerEvents = timerHistory.events?.filter(event => Boolean(event.timerStartedEventAttributes) || Boolean(event.timerFiredEventAttributes));
  if (timerEvents?.filter(event => !!event.timerStartedEventAttributes).length !== 1) {throw new Error('durable timer was not a single persisted timer');}
  if ((await business.readState(timer)).status !== 'timer-fired') {throw new Error('durable timer invariant');}
  record('timerThroughWorkerAndFullServiceSigkillRestart', { pass: true, result: timerResult, elapsedMs: Date.now() - timerStarted, serverRestartToGrpcMs: restartMs, timerEvents, ...await business.evidence(timer) });

  return worker;
}

async function upgradeAndCancellationScenarios(initialWorker: ChildProcess): Promise<void> {
  let worker = initialWorker;
  const pending = `${prefix}-upgrade`;
  const pendingHandle = await startActivation(pending);
  await awaitInitialRead(pending);
  await kill(worker);
  worker = await startWorker('v2');
  await approve(pending);
  const upgradeResult = await pendingHandle.result();
  if (upgradeResult !== 'active') {throw new Error('patched upgrade invariant');}
  const oldHistory = await pendingHandle.fetchHistory();
  record('pendingApprovalCompatiblePatchedWorkerUpdate', { pass: true, result: upgradeResult, eventCount: oldHistory.events?.length, patchMarkerCount: oldHistory.events?.filter(event => event.markerRecordedEventAttributes?.markerName === 'core_patch').length, ...await business.evidence(pending) });
  const fresh = `${prefix}-fresh-v2`;
  const freshHandle = await startActivation(fresh);
  await approve(fresh);
  await freshHandle.result();
  const freshHistory = await freshHandle.fetchHistory();
  if (freshHistory.events?.some(event => event.markerRecordedEventAttributes?.markerName === 'core_patch') !== true) {throw new Error('v2 patch marker missing');}
  record('newWorkflowUsesV2Patch', { pass: true, markers: freshHistory.events.filter(event => !!event.markerRecordedEventAttributes).map(event => event.markerRecordedEventAttributes) });

  const badQueue = `incompatible-${prefix}`;
  let badWorker = await startWorker('v1', badQueue);
  const incompatible = `${prefix}-incompatible`;
  const incompatibleHandle = await startActivation(incompatible, badQueue);
  await awaitInitialRead(incompatible);
  await kill(badWorker);
  badWorker = await startWorker('incompatible', badQueue);
  await approve(incompatible);
  let failure: unknown;
  await until(async () => {
    const history = await incompatibleHandle.fetchHistory();
    const event = history.events?.find(item => Number(item.workflowTaskFailedEventAttributes?.cause) === 24);
    if (event) { failure = event.workflowTaskFailedEventAttributes; return true; }
    return false;
  }, 'incompatible update rejected by nondeterminism', 30000);
  const blocked = await business.readState(incompatible);
  await kill(badWorker);
  badWorker = await startWorker('v2', badQueue);
  const fixed = await incompatibleHandle.result();
  await kill(badWorker);
  if (blocked.effects !== 0 || fixed !== 'active') {throw new Error('incompatible replay safety invariant');}
  record('incompatibleWorkflowUpdateNegativeAndRecovery', { pass: true, expectedNondeterminism: failure, businessStateWhileBlocked: blocked, recoveredWithPatchedV2: fixed });

  const cancelled = `${prefix}-cancel`;
  const cancelHandle = await startActivation(cancelled);
  await awaitInitialRead(cancelled);
  await business.cancel(cancelled);
  await cancelHandle.cancel();
  let cancellationFailure: string | undefined;
  try { await cancelHandle.result(); } catch (error) { cancellationFailure = error instanceof Error ? error.name : String(error); }
  const cancelStatus = (await cancelHandle.describe()).status.name;
  if (cancellationFailure === undefined || cancelStatus !== 'CANCELLED' || (await business.readState(cancelled)).effects !== 0) {throw new Error('cancellation invariant');}
  record('cancelPendingApproval', { pass: true, cancellationFailure, cancelStatus, ...await business.evidence(cancelled) });

}

async function staleScenario(): Promise<void> {
  if (process.platform !== 'win32') {
  const stale = `${prefix}-stale`;
  const staleQueue = `stale-${prefix}`;
  const paused = await startWorker('v1', staleQueue, { PAUSE_BEFORE_COMMIT_RUN: stale });
  const staleHandle = await startActivation(stale, staleQueue);
  await approve(stale);
  await until(() => existsSync(output(`paused-${stale}.json`)), 'paused predecessor reached precommit boundary');
  paused.kill('SIGSTOP');
  const replacement = await startWorker('v1', staleQueue);
  const replacementResult = await staleHandle.result();
  paused.kill('SIGCONT');
  await delay(2500);
  const staleEvidence = await business.evidence(stale);
  if (replacementResult !== 'active' || staleEvidence.state.effects !== 1 || staleEvidence.attempts.length < 2) {throw new Error('paused predecessor receipt invariant');}
  record('pausedPredecessorAfterReplacement', { pass: true, replacementResult, ...staleEvidence, limitation: 'Feature receipt serializes database acceptance. Temporal timeout invalidates old task completion; it does not fence external side effects or terminate the paused process.' });
  await kill(paused); await kill(replacement);
  } else {record('pausedPredecessorAfterReplacement', { executed: false, reason: 'POSIX SIGSTOP/SIGCONT fault injection; requires a Windows-specific equivalent' });}
}

try {
  await main();
} catch (error: unknown) {
  const failure = error instanceof Error ? error : new Error(String(error));
  result.failedAt = new Date().toISOString(); result.error = { name: failure.name, message: failure.message, stack: failure.stack };
  writeFileSync(output('results.json'), JSON.stringify(result, null, 2)); console.error(failure); process.exitCode = 1;
} finally {
  for (const child of processes) { if (process.platform !== 'win32') {child.kill('SIGCONT');} await kill(child); }
  if (connection !== undefined) {await connection.close();}
  await business.pool.end();
}
