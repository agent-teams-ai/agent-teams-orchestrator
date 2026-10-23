import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { DBOS } from '@dbos-inc/dbos-sdk';
import { Pool } from 'pg';
import { isEngineOutput, isEvent, isRecord, isSteps, type ExecutorEvent, type Request, type Status } from './protocol.ts';
import type { FeatureRun } from './business.ts';

const configuredURL = process.env.DBOS_SPIKE_PG_URL ?? process.env.SPIKE_DATABASE_URL ?? process.env.DATABASE_URL;
const decoded:unknown = configuredURL!==undefined && configuredURL!=='' ? { connectionString: configuredURL } : JSON.parse(readFileSync(process.env.DBOS_SPIKE_PG_CONFIG ?? process.env.PG_CONFIG_PATH ?? new URL('../pg-config.json', import.meta.url), 'utf8'));
if(typeof decoded!=='object'||decoded===null||!('connectionString' in decoded)||typeof decoded.connectionString!=='string'){throw new Error('Private PG configuration must contain connectionString');}
const config = {connectionString:decoded.connectionString};
const adminURL = new URL(config.connectionString);
const admin = new Pool({ connectionString: adminURL.toString(), max: 2 });
const dbName = process.env.DBOS_SPIKE_DATABASE ?? 'od035_dbos';
if (!/^[a-z][a-z0-9_]{0,62}$/.test(dbName)) {throw new Error('DBOS_SPIKE_DATABASE must be a safe lower-case PostgreSQL database name');}
if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])).rowCount===0) {await admin.query(`CREATE DATABASE ${dbName}`);}
await admin.end();
adminURL.pathname = '/' + dbName;
process.env.DATABASE_URL = adminURL.toString();
const { setup, createRun, pool } = await import('./business.ts');
await setup();
const workerPassword = randomBytes(18).toString('hex');
if ((await pool.query("SELECT 1 FROM pg_roles WHERE rolname='dbos_spike_worker'")).rowCount===0) {
  await pool.query(`CREATE ROLE dbos_spike_worker LOGIN PASSWORD '${workerPassword}'`);
} else {await pool.query(`ALTER ROLE dbos_spike_worker PASSWORD '${workerPassword}'`);}
await DBOS.migrate(adminURL.toString(), { schemaName: 'dbos_oss_spike', applicationRole: 'dbos_spike_worker' });
await pool.query(`GRANT CONNECT ON DATABASE ${dbName} TO dbos_spike_worker;
  GRANT USAGE ON SCHEMA dbos_spike_business TO dbos_spike_worker;
  GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA dbos_spike_business TO dbos_spike_worker;
  GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA dbos_spike_business TO dbos_spike_worker;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;`);
const workerURL = new URL(adminURL); workerURL.username = 'dbos_spike_worker'; workerURL.password = workerPassword;
const prefix = `dbos-${Date.now()}`;
let sequence = 0;
const allChildren = new Set<ChildProcess>();
const delay = (ms: number) => new Promise(resolve => { setTimeout(resolve, ms); });
const assert = (condition: boolean, message: string) => { if (!condition) {throw new Error(message);} };
class Executor {
  child: ChildProcess;
  events: ExecutorEvent[] = [];
  pending = new Map<number, { resolve: (r: unknown) => void, reject: (e: Error) => void }>();
  diagnostics: string[] = [];
  constructor(env: Record<string, string> = {}) {
    this.child = fork(fileURLToPath(new URL('./worker.ts', import.meta.url)), [], {
      execArgv: ['--import', 'tsx'], silent: true,
      env: { ...process.env, DATABASE_URL: workerURL.toString(), BUSINESS_DATABASE_URL: workerURL.toString(), RUN_MIGRATIONS: 'false', ...env },
    });
    allChildren.add(this.child);
    this.child.on('exit', () => { allChildren.delete(this.child); for (const p of this.pending.values()) {p.reject(new Error('executor exited'));} this.pending.clear(); });
    this.child.on('message', (message: unknown) => {
      if (!isEvent(message)) {return;}
      this.events.push(message);
      if (message.event === 'reply' && typeof message.requestID === 'number') {
        const p = this.pending.get(message.requestID); this.pending.delete(message.requestID);
        if (message.error!==undefined && message.error!=='') {p?.reject(new Error(message.error));} else {p?.resolve(message.result);}
      }
    });
    const logs = (chunk: Buffer) => { this.diagnostics.push(chunk.toString()); this.diagnostics = this.diagnostics.slice(-8); };
    this.child.stdout?.on('data', logs); this.child.stderr?.on('data', logs);
  }
  async event(name: string, runID?: string, timeout = 12000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const e = this.events.find(x => x.event === name && (runID===undefined || runID==='' || x.runID === runID));
      if (e) {return e;}
      if (this.child.exitCode !== null) {throw new Error(`executor exit before ${name}: ${this.diagnostics.join('').slice(-2500)}`);}
      await delay(20);
    }
    throw new Error(`timeout waiting ${name}: ${this.diagnostics.join('').slice(-2500)}`);
  }
  async call(op: Request['op'], args: Record<string, unknown> = {}, timeout = 12000): Promise<unknown> {
    const requestID = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestID); reject(new Error(`${op} timeout`)); }, timeout);
      this.pending.set(requestID, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
      this.child.send({ op, requestID, ...args });
    });
  }
  async stop(signal: NodeJS.Signals = 'SIGKILL') { if (this.child.exitCode !== null || this.child.signalCode !== null) {return;} const exit = once(this.child, 'exit'); this.child.kill(signal); await exit; }
}
const newExecutor = async (env: Record<string, string> = {}) => { const e = new Executor(env); await e.event('ready'); return e; };
const runID = (name: string) => `${prefix}-${name}`;
async function start(e: Executor, id: string, input: Record<string, unknown> = {}, queueName?: string) { await createRun(id); await e.call('start', { input: { runID: id, ...input }, queueName }); }
async function statusOf(e: Executor, id: string): Promise<Status> {
  const status = await e.call('status', { runID: id });
  if (!isRecord(status)||typeof status.status!=='string') {throw new Error(`workflow status absent or malformed: ${id}`);}
  const output=status.output??{};
  if(!isEngineOutput(output)){throw new Error(`workflow output malformed: ${id}`);}
  return {status:status.status,output,error:status.error};
}
async function stepsOf(e: Executor, id: string) {
  const steps=await e.call('steps',{runID:id});
  if(!isSteps(steps)){throw new Error(`workflow steps absent or malformed: ${id}`);}
  return steps;
}
async function terminal(e: Executor, id: string, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const s = await statusOf(e,id); if (!['PENDING','ENQUEUED','DELAYED'].includes(s.status)) {return s;} await delay(30); }
  throw new Error(`terminal timeout ${id}`);
}
async function business(id: string) {
  const row = (await pool.query<FeatureRun>('SELECT * FROM dbos_spike_business.runs WHERE id=$1', [id])).rows.at(0);
  if(row===undefined){throw new Error('Feature snapshot absent');}
  const attempts = (await pool.query<{generation:number;accepted:boolean}>('SELECT generation,accepted FROM dbos_spike_business.attempts WHERE run_id=$1 ORDER BY id', [id])).rows;
  const receipts = (await pool.query<{command_id:string}>('SELECT command_id FROM dbos_spike_business.receipts WHERE run_id=$1 ORDER BY command_id', [id])).rows;
  return { ...row, attempts, receipts };
}
type ScenarioResult = {name:string;outcome:'pass'|'fail'|'skipped';durationMs?:number;evidence?:unknown;error?:string;reason?:string};
const results = { candidate: 'DBOS OSS', sdk: '5.3.0', sourceCommit: '8643d389db64351f2acfce45e96e9747b4be8465', node: process.version, platform: `${process.platform}-${process.arch}`, postgres: (await pool.query<{server_version:string}>('SHOW server_version')).rows.at(0)?.server_version, cloudAndConductor: false, startedAt: new Date().toISOString(), finishedAt:'', summary:{passed:0,failed:0,skipped:0}, scenarios: [] as ScenarioResult[] };
if(process.env.SPIKE_OUTPUT_DIR!==undefined && process.env.SPIKE_OUTPUT_DIR!==''){mkdirSync(process.env.SPIKE_OUTPUT_DIR,{recursive:true});}
const resultPath = process.env.DBOS_SPIKE_RESULTS_PATH!==undefined && process.env.DBOS_SPIKE_RESULTS_PATH!=='' ? resolvePath(process.env.DBOS_SPIKE_RESULTS_PATH) : process.env.SPIKE_OUTPUT_DIR!==undefined && process.env.SPIKE_OUTPUT_DIR!=='' ? resolvePath(process.env.SPIKE_OUTPUT_DIR,'results.json') : new URL('./results.json', import.meta.url);
async function scenario(name: string, body: () => Promise<unknown>) {
  if (process.env.SPIKE_SCENARIOS!==undefined && process.env.SPIKE_SCENARIOS!=='' && !process.env.SPIKE_SCENARIOS.split(',').some(value => name.includes(value))) {return;}
  const begin = Date.now();
  try { const evidence = await body(); results.scenarios.push({ name, outcome: 'pass', durationMs: Date.now() - begin, evidence }); console.log(`PASS ${name}`); }
  catch(e) { results.scenarios.push({ name, outcome: 'fail', durationMs: Date.now() - begin, error: String(e) }); console.log(`FAIL ${name}: ${String(e)}`); }
  writeFileSync(resultPath, JSON.stringify(results, null, 2) + '\n');
  for (const child of allChildren) { if (child.pid!==undefined) { if (process.platform !== 'win32') {child.kill('SIGCONT');} child.kill('SIGKILL'); } }
  await delay(50);
}

await scenario('early-and-duplicate-approval', async () => {
  const e = await newExecutor({ APP_VERSION: 'compatible-v1' }); const id = runID('early');
  await start(e,id,{ delayMs: 600, duplicate: true }); await e.event('started',id);
  const beforeWait = !e.events.some(x=>x.event==='waiting' && x.runID===id);
  await e.call('approve',{runID:id}); await e.call('approve',{runID:id});
  await e.call('send',{runID:id,key:`${id}:approval-wakeup`}); await e.call('send',{runID:id,key:`${id}:approval-wakeup`});
  const status = await terminal(e,id); const state = await business(id);
  assert(beforeWait && status.status==='SUCCESS' && state.counter===1 && status.output.duplicate===null,'early/duplicate safety mismatch');
  return { runID:id, earlySendBeforeWait:beforeWait, status:status.status, output:status.output, business:state };
});
await scenario('feature-approval-commit-before-send-requires-durable-outbox-dispatch', async () => {
  const id=runID('approval-outbox-gap');let e=await newExecutor({APP_VERSION:'compatible-v1',CRASH_BEFORE_SEND:id});await start(e,id);await e.event('waiting',id);
  const pendingReply=e.call('approve',{runID:id}).catch(()=>null);await e.event('approval-committed',id);await e.stop();await pendingReply;
  e=await newExecutor({APP_VERSION:'compatible-v1'});let before=await statusOf(e,id);const deadline=Date.now()+5000;
  while(before.status==='ENQUEUED' && Date.now()<deadline){await delay(30);before=await statusOf(e,id);}
  await delay(250);before=await statusOf(e,id);const beforeBusiness=await business(id);
  const pendingOutbox=(await pool.query<{id:string;published:boolean}>('SELECT id,published FROM dbos_spike_business.approval_outbox WHERE run_id=$1',[id])).rows;
  assert(before.status==='PENDING' && beforeBusiness.approved && beforeBusiness.counter===0 && pendingOutbox.some(row=>!row.published),'feature/send gap not reproduced');
  await e.call('dispatch-approval',{runID:id});const status=await terminal(e,id);const state=await business(id);
  assert(status.status==='SUCCESS' && state.counter===1,'durable outbox dispatch did not finish process');
  return {runID:id,beforeDispatch:before.status,beforeBusiness,pendingOutbox,afterDispatch:status.status,business:state,guarantee:'Feature transaction durably recorded approval and dispatch identity; DBOS durability begins only after send succeeds; harness explicitly replayed the feature-owned outbox port'};
});
await scenario('sigkill-after-business-commit-before-engine-checkpoint', async () => {
  const id = runID('commit-gap'); let e = await newExecutor({APP_VERSION:'compatible-v1',CRASH_AFTER_COMMIT:id});
  await start(e,id); await e.call('approve',{runID:id}); await e.event('business-committed',id);
  const before = await stepsOf(e,id); assert(!before.some(x=>x.name==='featureActivation'),'effect already checkpointed');
  await e.stop(); e = await newExecutor({APP_VERSION:'compatible-v1'}); const status=await terminal(e,id); const state=await business(id);
  assert(status.status==='SUCCESS' && state.counter===1 && state.attempts.length===2,'receipt did not protect replay');
  return {runID:id,checkpointMissingAtKill:true,status:status.status,business:state,guarantee:'DBOS re-ran the uncheckpointed step; feature receipt alone prevented duplicate mutation'};
});
await scenario('durable-timer-sigkill-restart', async () => {
  const id=runID('timer');let e=await newExecutor({APP_VERSION:'compatible-v1'});const startedAt=Date.now();
  await start(e,id,{delayMs:2500});await e.event('started',id);await e.call('approve',{runID:id});await delay(250);
  const stepsBefore=await stepsOf(e,id);await e.stop();await delay(300);e=await newExecutor({APP_VERSION:'compatible-v1'});
  const status=await terminal(e,id);const elapsedMs=Date.now()-startedAt;
  assert(status.status==='SUCCESS' && elapsedMs>=2400 && elapsedMs<5000,'timer deadline reset or lost');
  return {runID:id,status:status.status,elapsedMs,stepsBeforeKill:stepsBefore.map(x=>({name:x.name,output:x.output}))};
});
await scenario('default-hash-compatible-code-update-does-not-auto-recover', async () => {
  const id=runID('default-upgrade');let e=await newExecutor();const oldVersion=(await e.event('ready')).applicationVersion;
  await start(e,id);await e.event('waiting',id);await delay(100);await e.stop();e=await newExecutor({CODE_REVISION:'compatible'});const newVersion=(await e.event('ready')).applicationVersion;
  await e.call('approve',{runID:id});await delay(800);const stranded=await statusOf(e,id);await e.stop();
  e=await newExecutor();const recovered=await terminal(e,id);assert(oldVersion!==newVersion && stranded.status==='PENDING' && recovered.status==='SUCCESS','version isolation mismatch');
  return {runID:id,oldVersion,newVersion,afterUpdate:stranded.status,afterOldCodeRestored:recovered.status,limitation:'Default update leaves old workflow pending until an executor with the old application version returns'};
});
await scenario('explicit-compatible-version-code-update-recovers-pending-approval', async () => {
  const id=runID('compatible-upgrade');let e=await newExecutor({APP_VERSION:'compatible-v2'});await start(e,id);await e.event('waiting',id);await delay(100);await e.stop();
  e=await newExecutor({APP_VERSION:'compatible-v2',CODE_REVISION:'compatible'});await e.call('approve',{runID:id});const status=await terminal(e,id);assert(status.status==='SUCCESS' && status.output.compatibleCodeRevision===2,'compatible update failed');
  return {runID:id,status:status.status,output:status.output,business:await business(id)};
});
await scenario('unpatched-incompatible-change-rejected', async () => {
  const id=runID('broken-upgrade');let e=await newExecutor({APP_VERSION:'unsafe-fixed-version'});await start(e,id);await e.event('waiting',id);await delay(100);await e.stop();
  e=await newExecutor({APP_VERSION:'unsafe-fixed-version',CODE_REVISION:'broken'});const status=await terminal(e,id);const state=await business(id);
  assert(status.status==='ERROR' && state.counter===0,'incompatible code replay not rejected');
  return {runID:id,status:status.status,error:status.error,business:state};
});
await scenario('supported-patch-incompatible-change-recovers-old-and-runs-new', async () => {
  const id=runID('patched-old');let e=await newExecutor({PATCHING:'true'});await start(e,id);await e.event('waiting',id);await delay(100);await e.stop();
  e=await newExecutor({PATCHING:'true',CODE_REVISION:'patched'});await e.call('approve',{runID:id});const old=await terminal(e,id);
  const freshID=runID('patched-new');await start(e,freshID);await e.call('approve',{runID:freshID});const fresh=await terminal(e,freshID);
  const oldSteps=await stepsOf(e,id);const newSteps=await stepsOf(e,freshID);
  assert(old.status==='SUCCESS' && fresh.status==='SUCCESS' && !oldSteps.some(s=>s.name==='newIncompatibleStep') && newSteps.some(s=>s.name==='newIncompatibleStep'),'patch compatibility failed');
  return {runIDs:[id,freshID],applicationVersion:(await e.event('ready')).applicationVersion,oldSteps:oldSteps.map(s=>s.name),newSteps:newSteps.map(s=>s.name)};
});
await scenario('cancel-durable-wait-then-late-approval-and-restart', async () => {
  const id=runID('cancel');let e=await newExecutor({APP_VERSION:'compatible-v1'});await start(e,id);await e.event('waiting',id);await e.call('cancel',{runID:id});await e.call('approve',{runID:id});await e.stop();e=await newExecutor({APP_VERSION:'compatible-v1'});await delay(250);
  const status=await statusOf(e,id);const state=await business(id);assert(status.status==='CANCELLED' && state.counter===0,'cancelled workflow activated');return {runID:id,status:status.status,business:state};
});
if (process.platform === 'win32') {for (const mode of ['same-receipt','feature-generation-fence']) {results.scenarios.push({name:`paused-predecessor-replacement-resume-${mode}`,outcome:'skipped',reason:'SIGSTOP/SIGCONT unavailable through native Node process signals on Windows; requires a Windows-specific suspension/custody probe'});}}
for (const fenced of process.platform === 'win32' ? [] : [false,true]) {await scenario(`paused-predecessor-replacement-resume-${fenced?'feature-generation-fence':'same-receipt'}`,async()=>{
  const id=runID(`predecessor-${fenced}`);const old=await newExecutor({APP_VERSION:'compatible-v1',PAUSE_BEFORE_COMMIT:'true',GENERATION:'1'});
  await start(old,id,{pauseBeforeCommit:true});await old.call('approve',{runID:id});await old.event('before-business-command',id);old.child.kill('SIGSTOP');
  if(fenced) {await pool.query('UPDATE dbos_spike_business.runs SET generation=2 WHERE id=$1',[id]);}
  const replacement=await newExecutor({APP_VERSION:'compatible-v1',GENERATION:fenced?'2':'1'});const status=await terminal(replacement,id);old.child.kill('SIGCONT');old.child.send({op:'release-effect'});await old.event('business-committed',id);await delay(200);const state=await business(id);
  assert(status.status==='SUCCESS' && state.counter===1 && state.attempts.length===2 && (!fenced || state.attempts.at(1)?.accepted===false),'stale predecessor result unsafe');
  return {runID:id,status:status.status,business:state,limitation:'A replacement may execute while predecessor remains alive; engine cannot prevent arbitrary already-running user code from reaching a business port'};
});}
await scenario('least-privilege-runtime-denies-ddl', async()=>{
  const limited=new Pool({connectionString:workerURL.toString(),max:1});let denied=false;
  try{await limited.query('CREATE TABLE dbos_oss_spike.forbidden_ddl(id int)');}catch(e:unknown){denied=typeof e==='object' && e!==null && 'code' in e && e.code==='42501';}await limited.end();
  const e=await newExecutor({APP_VERSION:'compatible-v1'});const id=runID('leastpriv');await start(e,id);await e.call('approve',{runID:id});const status=await terminal(e,id);assert(denied && status.status==='SUCCESS','least privilege launch failed');return {runID:id,runMigrations:false,runtimeDDLDenied:denied,status:status.status};
});
await scenario('bounded-pool-under-many-durable-waits-control-remains-responsive',async()=>{
  const e=await newExecutor({APP_VERSION:'compatible-v1'});const ids=Array.from({length:80},(_,i)=>runID(`load-${i}`));
  for(const id of ids){await start(e,id);}await Promise.all(ids.map(id=>e.event('waiting',id)));const begin=Date.now();
  await e.call('cancel',{runID:ids[0]});const cancelLatencyMs=Date.now()-begin;const control=runID('load-control');await start(e,control);await e.call('approve',{runID:control});const status=await terminal(e,control);const controlCompletionMs=Date.now()-begin;
  const connections=(await pool.query<{count:number}>("SELECT count(*)::int AS count FROM pg_stat_activity WHERE usename='dbos_spike_worker'")).rows.at(0)?.count ?? 0;
  for(const id of ids.slice(1)){await e.call('cancel',{runID:id});}assert(status.status==='SUCCESS' && cancelLatencyMs<2000 && controlCompletionMs<4000 && connections<=8,'control starvation');
  return {waitingWorkflows:ids.length,systemPoolSize:4,pollingConcurrency:2,businessPoolSize:3,observedConnections:connections,cancelLatencyMs,controlCompletionMs};
});
await scenario('waiting-queue-saturation-and-reserved-control-queue',async()=>{
  const e=await newExecutor({APP_VERSION:'compatible-v1',QUEUE_TEST:'true'});const ids=[runID('q1'),runID('q2'),runID('q3')] as const;for(const id of ids){await start(e,id,{},'spike-waiting');}
  await e.event('waiting',ids[0]);await e.event('waiting',ids[1]);await delay(150);const blocked=await statusOf(e,ids[2]);const control=runID('queue-control');const begin=Date.now();await start(e,control,{},'spike-control');await e.call('approve',{runID:control});const status=await terminal(e,control);const controlLatencyMs=Date.now()-begin;
  for(const id of ids){await e.call('cancel',{runID:id});}assert(blocked.status==='ENQUEUED' && status.status==='SUCCESS' && controlLatencyMs<3000,'reserved queue failed');
  return {saturatedQueueConcurrency:2,thirdWorkflowStatus:blocked.status,reservedControlStatus:status.status,controlLatencyMs,limitation:'Waiting workflows consume queue workflow-concurrency slots; reserve an independent control queue or invoke control ports directly'};
});
await scenario('supported-history-delete-keeps-feature-state-and-receipts',async()=>{
  const e=await newExecutor({APP_VERSION:'compatible-v1'});const id=runID('retention');await start(e,id);await e.call('approve',{runID:id});await terminal(e,id);const before=await stepsOf(e,id);await e.call('delete',{runIDs:[id]});const after=await e.call('status',{runID:id});const state=await business(id);
  assert(after===null && state.counter===1 && state.receipts.length===2,'delete crossed business boundary');return {runID:id,historyStepsBefore:before.length,engineStatusAfter:after,business:state,limitation:'OSS supports explicit deletion; automatic retention service is not configured and Conductor capabilities are excluded'};
});
results.finishedAt=new Date().toISOString();results.summary={passed:results.scenarios.filter(s=>s.outcome==='pass').length,failed:results.scenarios.filter(s=>s.outcome==='fail').length,skipped:results.scenarios.filter(s=>s.outcome==='skipped').length};
if(results.summary.failed){process.exitCode=1;}
writeFileSync(resultPath,JSON.stringify(results,null,2)+'\n');await pool.end();console.log(JSON.stringify(results.summary));
