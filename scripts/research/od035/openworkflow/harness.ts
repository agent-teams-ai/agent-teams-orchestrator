import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { OpenWorkflow } from 'openworkflow';
import { BackendPostgres } from 'openworkflow/postgres';
import postgres from 'postgres';
import type { TraceRecord } from './business-postgres.ts';
import { BusinessPostgres } from './business-postgres.ts';

const dir = fileURLToPath(new URL('.',import.meta.url));
const delay = (ms:number)=>new Promise(resolve=>{setTimeout(resolve,ms);});
interface ScenarioResult {scenario:string;status:'passed'|'failed'|'skipped';started?:string;finished?:string;details?:unknown;error?:string;reason?:string}
interface WorkerEvent {event:string;id?:string|undefined;detail?:string|undefined;at?:string|undefined;pid?:number|undefined;text?:string;line?:string}
const results: ScenarioResult[]=[];
const events: WorkerEvent[]=[];
const children = new Set<ChildProcess>();
const namespaceId=`od035-${new Date().toISOString().replace(/[^0-9]/g,'')}`;
let serial=0;
function recordWorkerEvent(line:string):void {
  const parsed:unknown=JSON.parse(line);
  if(parsed===null||typeof parsed!=='object'||!('event' in parsed)||typeof parsed.event!=='string'){throw Error('Invalid worker event');}
  events.push({event:parsed.event,id:'id' in parsed&&typeof parsed.id==='string'?parsed.id:undefined,pid:'pid' in parsed&&typeof parsed.pid==='number'?parsed.pid:undefined,detail:'detail' in parsed&&typeof parsed.detail==='string'?parsed.detail:undefined,at:'at' in parsed&&typeof parsed.at==='string'?parsed.at:undefined});
}
function traceEvent(trace:TraceRecord[],event:string):TraceRecord {const found=trace.find(item=>item.event===event);assert(found,`Expected trace event ${event}`);return found;}
function errorCode(value:unknown):unknown {return value!==null&&typeof value==='object'&&'code' in value?value.code:undefined;}
async function createContext() {
  let url=process.env.SPIKE_DATABASE_URL;
  if(url===undefined){const config:unknown=JSON.parse(await readFile(process.env.PG_CONFIG_PATH??process.env.SPIKE_PG_CONFIG??new URL('../pg-config.json',import.meta.url),'utf8'));assert(config!==null&&typeof config==='object'&&'connectionString' in config&&typeof config.connectionString==='string');url=config.connectionString;}
  const migration=await BackendPostgres.connect(url,{schema:'ow_engine_fixture',namespaceId});
  await migration.stop();
  const pool=postgres(url,{max:3,onnotice:()=>{},transform:{column:{from:postgres.toCamel}}});
  const backend=BackendPostgres.fromPool(pool,{schema:'ow_engine_fixture',namespaceId});
  const ow=new OpenWorkflow({backend});
  const business=new BusinessPostgres(url);await business.setup();
  async function eventually<T>(fn:()=>Promise<T>, test:(r:T)=>boolean, timeout=15000):Promise<T>{
    const deadline=Date.now()+timeout;let value:T|undefined;
    do {value=await fn();if(test(value)){return value;}await delay(35);}while(Date.now()<deadline);
    throw Error(`Timed out after ${timeout}ms; last=${JSON.stringify(value)}`);
  }
  async function event(name:string,id='') { return eventually(async()=>events.find(e=>e.event===name&&(!id||e.id===id)),Boolean); }
  async function worker(flavor='base',concurrency=3) {
    const p=spawn(process.execPath,['--import','tsx',`${dir}worker.ts`],{cwd:dir,env:{...process.env,SPIKE_DATABASE_URL:url,SPIKE_NAMESPACE:namespaceId,SPIKE_FLAVOR:flavor,SPIKE_CONCURRENCY:String(concurrency)},stdio:['ignore','pipe','pipe']});
    children.add(p);let buffer='';
    p.stdout.on('data',chunk=>{buffer+=String(chunk);const lines=buffer.split('\n');buffer=lines.pop()??'';for(const line of lines){try{recordWorkerEvent(line);}catch{events.push({event:'unparsed-output',line});}}});
    p.stderr.on('data',(chunk:unknown)=>{events.push({event:'worker-stderr',text:String(chunk).slice(0,300)});});
    await eventually(async()=>events.find(e=>e.event==='worker-ready'&&e.pid===p.pid),Boolean);return p;
  }
  async function kill(p:ChildProcess,signal:NodeJS.Signals='SIGKILL') {
    if(p.exitCode!==null||p.signalCode!==null){return;}
    const done=new Promise<void>(resolve=>{p.once('exit',()=>{resolve();});});p.kill(signal);await done;children.delete(p);
  }
  async function create(name:string,approved=true,version='1') {
    const id=`${namespaceId}-${name}-${++serial}`;await business.create(id,approved);
    const handle=await ow.runWorkflow<{id:string;race?:boolean},unknown>({name,version},{id,race:name==='approval'});
    return {id,runId:handle.workflowRun.id};
  }
  async function run(runId:string) {return backend.getWorkflowRun({workflowRunId:runId});}
  async function terminal(runId:string,timeout=15000) {return eventually(()=>run(runId),r=>!!r&&['completed','failed','canceled'].includes(r.status),timeout);}
  async function parked(runId:string) {return eventually(()=>run(runId),r=>r?.status==='running'&&r.workerId===null);}
  async function scenario(name:string,body:()=>Promise<unknown>) {
    if(process.env.SPIKE_SCENARIOS!==undefined&&!process.env.SPIKE_SCENARIOS.split(',').some(value=>name.includes(value))){return;}
    if(name.startsWith('SIGSTOP')&&process.platform==='win32'){results.push({scenario:name,status:'skipped',reason:'SIGSTOP is unavailable on native Windows'});return;}
    const started=new Date().toISOString();
    try {const details=await body();results.push({scenario:name,status:'passed',started,finished:new Date().toISOString(),details});console.log(`PASS ${name}`);}
    catch(error){results.push({scenario:name,status:'failed',started,finished:new Date().toISOString(),error:String(error)});console.log(`FAIL ${name}: ${String(error)}`);}
    for(const p of children){await kill(p);}
  }
  return {event,worker,kill,create,run,terminal,parked,scenario,business,ow,pool,eventually};
}
type HarnessContext=Awaited<ReturnType<typeof createContext>>;
async function runScenarioGroup0(context:HarnessContext) {
  const {event,worker,kill,create,terminal,scenario,business,ow}=context;
  await scenario('raw-early-signal-is-lost-negative-control',async()=>{
    const a=await create('raw');const sent=await ow.sendSignal({signal:a.id,data:{approved:true}});
    assert.equal(sent.workflowRunIds.length,0);await worker();const final=await terminal(a.runId);
    assert.deepEqual(final?.output,{received:false});return {...a,sent,final};
  });
  await scenario('approval-commit-before-wait-durable-timeout-rechecks',async()=>{
    const a=await create('approval',false);await worker();await event('before-wait',a.id);
    await business.approve(a.id);const sent=await ow.sendSignal({signal:a.id,data:{approved:true}});assert.equal(sent.workflowRunIds.length,0);
    const final=await terminal(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.state.counter,'1');
    return {...a,sent,final,snapshot,mechanism:'feature-specific loop; step.waitForSignal timeout; named step per authoritative read'};
  });
  await scenario('approval-COMMIT-process-dies-before-signal-recovered-with-no-send',async()=>{
    const a=await create('approval',false);const p=await worker();await event('before-wait',a.id);
    await business.approve(a.id);await kill(p);const committed=await business.snapshot(a.id);
    await worker();const final=await terminal(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.state.counter,'1');
    return {...a,committed,final,snapshot,signalSends:0,observation:'durable authoritative approval survives sender/worker crash with no wake delivery; engine timeout causes fresh read'};
  });
}
async function runScenarioGroup1(context:HarnessContext) {
  const {event,worker,kill,create,terminal,parked,scenario,business,ow,pool,eventually}=context;
  await scenario('supported-recurring-reconciliation-after-worker-outage',async()=>{
    const id=`${namespaceId}-reconcile-${++serial}`;await business.create(id,false);
    const schedule=await ow.scheduleWorkflow({name:'reconcile'},{id},{id:`${id}:schedule`,cron:'* * * * * *'});
    let p=await worker();await delay(1500);await kill(p);await business.approve(id);await delay(1400);
    const committed=await business.snapshot(id);assert.equal(committed.state.counter,'0');
    p=await worker();const snapshot=await eventually(()=>business.snapshot(id),r=>r.state.counter==='1');
    await ow.schedules.delete(schedule.id);await kill(p);
    const runs=await pool<{id:string;version:string|null;status:string;workflowScheduleId:string}[]>`SELECT id,version,status,workflow_schedule_id FROM ow_engine_fixture.workflow_runs WHERE namespace_id=${namespaceId} AND workflow_schedule_id=${schedule.id}`;
    assert(runs.some(r=>r.status==='completed'));return {id,schedule,committed,snapshot,runs,observation:'supported persisted cron dispatch; finite per-tick workflow, no repository scheduler; retention still unbounded across runs'};
  });
  await scenario('recurring-schedule-rejects-versioned-workflow-negative-control',async()=>{
    const id=`${namespaceId}-schedule-version-${++serial}`;await business.create(id,true);
    let error='';try {await ow.scheduleWorkflow({name:'schedule-version',version:'1'},{id},{id:`${id}:schedule`,cron:'* * * * * *'});}catch(e){error=String(e);}
    assert.match(error,/require an unversioned workflow/);return {id,error,observation:'supported recurring schedule entrypoint must be unversioned; no silent version drop, no versioned recurring entrypoint'};
  });
  await scenario('duplicate-approval-and-command-receipt',async()=>{
    const a=await create('approval',false);await worker();await event('before-wait',a.id);await parked(a.runId);
    await business.approve(a.id);
    const first=await ow.sendSignal({signal:a.id,data:{approved:true},idempotencyKey:`${a.id}:approval`});
    const second=await ow.sendSignal({signal:a.id,data:{approved:true},idempotencyKey:`${a.id}:approval`});
    const final=await terminal(a.runId);const duplicate=await business.activate(a.id,`${a.id}:activate`);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.state.counter,'1');assert.equal(duplicate.outcome,'duplicate-receipt');
    return {...a,first,second,duplicate,snapshot};
  });
}
async function runScenarioGroup2(context:HarnessContext) {
  const {event,worker,kill,create,terminal,parked,scenario,business,ow,pool}=context;
  await scenario('SIGKILL-after-business-commit-before-engine-checkpoint',async()=>{
    const a=await create('gap');const p=await worker('crash');await event('after-commit-before-checkpoint',a.id);
    const before=await business.snapshot(a.id);assert.equal(before.state.counter,'1');
    const historyBefore=await pool<{stepName:string;status:string}[]>`SELECT step_name,status FROM ow_engine_fixture.step_attempts WHERE workflow_run_id=${a.runId}`;
    assert.equal(historyBefore[0]?.status,'running');await kill(p);await worker();const final=await terminal(a.runId);const after=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(after.state.counter,'1');assert.deepEqual(after.trace.map(x=>x.detail),['applied','duplicate-receipt']);
    return {...a,historyBefore,before,after,final,guaranteeOwner:'business transaction + command receipt, not engine exactly-once'};
  });
  await scenario('durable-timer-SIGKILL-restart',async()=>{
    const a=await create('timer');const p=await worker();const asleep=await parked(a.runId);await kill(p);await delay(1400);await worker();const final=await terminal(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.state.counter,'1');assert.equal(snapshot.trace.filter(x=>x.event==='before-timer').length,1);return {...a,asleep,final,snapshot};
  });
  await scenario('pending-approval-compatible-code-named-step-identity',async()=>{
    const a=await create('upgrade');const p=await worker();await parked(a.runId);await kill(p);await business.approve(a.id);await ow.sendSignal({signal:a.id,data:{approved:true}});await worker('compatible');
    const final=await terminal(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.trace.filter(x=>x.event==='prepared').length,1);assert.equal(snapshot.trace.filter(x=>x.event==='new-compatible-step').length,1);return {...a,final,snapshot};
  });
}
async function runScenarioGroup3(context:HarnessContext) {
  const {worker,kill,create,run,terminal,parked,scenario,business,ow,eventually}=context;
  await scenario('pending-approval-explicit-incompatible-version-routes-N-and-Nminus1',async()=>{
    const old=await create('upgrade');const p=await worker();await parked(old.runId);await kill(p);await business.approve(old.id);await ow.sendSignal({signal:old.id,data:{approved:true}});
    const next=await create('upgrade',true,'2');await worker('v2-only');await parked(next.runId);
    const oldWithOnlyV2=await eventually(()=>run(old.runId),r=>r?.status==='pending');assert.equal(oldWithOnlyV2?.version,'1');
    for(const child of children){await kill(child);}
    await worker();await ow.sendSignal({signal:next.id,data:{approved:true}});
    const finals=await Promise.all([terminal(old.runId),terminal(next.runId)]);const snapshots=await Promise.all([business.snapshot(old.id),business.snapshot(next.id)]);
    const oldSnapshot=snapshots.at(0);const newSnapshot=snapshots.at(1);assert(oldSnapshot!==undefined&&newSnapshot!==undefined);assert.equal(traceEvent(oldSnapshot.trace,'version-route').detail,'1');assert.equal(traceEvent(newSnapshot.trace,'version-route').detail,'2');
    return {old,next,oldWithOnlyV2,finals,snapshots};
  });
  await scenario('unsafe-step-rename-same-version-negative-control',async()=>{
    const a=await create('upgrade');const p=await worker();await parked(a.runId);await kill(p);await business.approve(a.id);await ow.sendSignal({signal:a.id,data:{approved:true}});await worker('unsafe-change');const final=await terminal(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'completed');assert.equal(snapshot.trace.filter(x=>x.event==='prepared').length,2);return {...a,final,snapshot,observation:'renaming a completed named step executes callback again; no incompatible-history rejection'};
  });
  await scenario('cancel-parked-run-before-late-approval',async()=>{
    const a=await create('cancel');await worker();await parked(a.runId);await business.cancel(a.id);await ow.cancelWorkflowRun(a.runId);const sent=await ow.sendSignal({signal:a.id,data:{approved:true}});await delay(500);const final=await run(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'canceled');assert.equal(snapshot.state.counter,'0');return {...a,final,sent,snapshot};
  });
}
async function runScenarioGroup4(context:HarnessContext) {
  const {event,worker,create,run,terminal,parked,scenario,business,ow,pool}=context;
  await scenario('cancel-active-callback-requires-business-cutoff',async()=>{
    const a=await create('cancel-active');await worker();await event('active-callback',a.id);await business.cancel(a.id);await ow.cancelWorkflowRun(a.runId);await delay(1800);const final=await run(a.runId);const snapshot=await business.snapshot(a.id);
    assert.equal(final?.status,'canceled');assert.equal(snapshot.state.counter,'0');assert.equal(snapshot.trace[0]?.detail,'canceled');return {...a,final,snapshot,observation:'callback continues after engine cancellation; business cutoff rejects effect'};
  });
  await scenario('SIGSTOP-predecessor-lease-takeover-resume-fencing',async()=>{
    const a=await create('stale');const old=await worker('predecessor');await event('pause-before-effect',a.id);old.kill('SIGSTOP');await business.replace(a.id);await delay(1000);await worker('successor');const final=await terminal(a.runId);assert.equal(final?.status,'completed');old.kill('SIGCONT');await event('business-callback-finished',a.id);await delay(2100);const snapshot=await business.snapshot(a.id);
    assert.equal(snapshot.state.counter,'1');assert(snapshot.trace.some(x=>x.detail==='stale-generation'));assert.equal(snapshot.trace.filter(x=>x.event==='after-effect').length,1);
    const history=await pool<{stepName:string;status:string;count:string}[]>`SELECT step_name,status,count(*)::text AS count FROM ow_engine_fixture.step_attempts WHERE workflow_run_id=${a.runId} GROUP BY step_name,status`;
    return {...a,final,snapshot,history,observation:'old callback attempted business write; app generation rejected it; engine ownership fence rejected stale checkpoint'};
  });
  await scenario('waiting-workflows-free-concurrency-slot-control-progress',async()=>{
    const waiters=[];for(let i=0;i<15;i++){waiters.push(await create('cancel'));}
    await worker('base',1);await Promise.all(waiters.map(a=>parked(a.runId)));const started=Date.now();const control=await create('control');const final=await terminal(control.runId);const latencyMs=Date.now()-started;assert.equal(final?.status,'completed');assert(latencyMs<5000);
    for(const a of waiters){await ow.cancelWorkflowRun(a.runId);}return {waiters:waiters.length,workerConcurrency:1,control,latencyMs,scope:'15 parked waits only; not enterprise scale or CPU/control reserve evidence'};
  });
}
async function runScenarioGroup5(context:HarnessContext) {
  const {worker,kill,create,terminal,parked,scenario,business,ow,pool}=context;
  await scenario('pending-backlog-delays-awakened-control-negative-control',async()=>{
    const control=await create('wake-control');const old=await worker('base',1);await parked(control.runId);await kill(old);
    const busy=[];for(let i=0;i<20;i++){busy.push(await create('busy'));}
    await ow.sendSignal({signal:control.id,data:{}});const start=Date.now();await worker('base',1);await terminal(control.runId);const latencyMs=Date.now()-start;
    const ordinary=await Promise.all(busy.map(a=>business.snapshot(a.id)));const target=await business.snapshot(control.id);
    const allOrdinaryFinished=ordinary.every(r=>r.trace.some(x=>x.event==='ordinary-finished'));
    const controlSeq=BigInt(traceEvent(target.trace,'control-progress').seq);
    assert(allOrdinaryFinished);assert(ordinary.every(r=>BigInt(traceEvent(r.trace,'ordinary-finished').seq)<controlSeq));
    return {control,ordinaryRuns:busy.length,workerConcurrency:1,latencyMs,allOrdinaryFinishedBeforeControl:true,observation:'all twenty ordinary pending runs admitted before an already-due awakened running control; no reserved control progress in shared namespace'};
  });
  await scenario('process-readiness-and-RSS-sample',async()=>{
    const start=Date.now();const p=await worker();const readyMs=Date.now()-start;
    const rss=process.platform==='linux'?(await readFile(`/proc/${p.pid}/status`,'utf8')).match(/^VmRSS:\s+(\d+)/m)?.[1]:undefined;
    return {workerPid:p.pid,workerReadyMs:readyMs,workerRssKb:rss!==undefined?Number(rss):null,databaseExcluded:true,methodology:'one native Node24.19 process launch after engine/business schemas migrated and PostgreSQL already running; readiness is worker.start resolved, RSS read immediately afterward; tsx loader included; no benchmark/peak/steady/load claim'};
  });
  await scenario('1000-total-step-attempt-limit-negative-control',async()=>{
    const a=await create('limit');await worker();const final=await terminal(a.runId,30000);const count=await pool<{count:string}[]>`SELECT count(*)::text AS count FROM ow_engine_fixture.step_attempts WHERE workflow_run_id=${a.runId}`;
    assert.equal(final?.status,'failed');assert.equal(errorCode(final.error),'STEP_LIMIT_EXCEEDED');assert.equal(count.at(0)?.count,'1000');return {...a,final,count,observation:'a permanent polling loop needs bounded segments and cannot run forever in one engine run'};
  });}
async function runScenarios(context:HarnessContext) {
  await runScenarioGroup0(context);
  await runScenarioGroup1(context);
  await runScenarioGroup2(context);
  await runScenarioGroup3(context);
  await runScenarioGroup4(context);
  await runScenarioGroup5(context);
}
async function main() {
  const context=await createContext();await runScenarios(context);const {business,pool}=context;
  const report={resultInterpretation:'Passed means assertion matched, including deliberately observed negative controls; this is not engine or release qualification',engine:'OpenWorkflow',version:'0.11.0',sourceCommit:'80d90b8d06b0cd43023dd324caa51fe35de4588f',runtime:process.version,os:process.platform,arch:process.arch,namespaceId,started:results[0],results,events:events.filter(e=>e.event!=='worker-stderr'),limitations:['Linux only; macOS/Windows packaging not qualified','Timer shortened to 1.2s; no clock discontinuity/full disk/corruption test','No retention API qualification or bounded-history continuation solution','No cloud, no Docker; PG managed by native supervisor fixture','SIGSTOP Linux evidence is not Windows process-suspension evidence','No external provider side effect exercised; receipts protect one owned PostgreSQL mutation']};
  const outputDir=process.env.SPIKE_OUTPUT_DIR??dir;await mkdir(outputDir,{recursive:true});
  await writeFile(`${outputDir}/results.json`,JSON.stringify(report,null,2)+'\n');await business.close();await pool.end();
  console.log(JSON.stringify({passed:results.filter(x=>x.status==='passed').length,total:results.length,namespaceId}));
  if(results.some(x=>x.status==='failed')){process.exitCode=1;}
}
main().catch((e:unknown)=>{console.error(String(e));process.exitCode=1;}).finally(()=>{for(const p of children){if(process.platform!=='win32'){p.kill('SIGCONT');}p.kill('SIGKILL');}});
