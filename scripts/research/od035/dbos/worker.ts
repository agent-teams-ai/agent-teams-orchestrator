import { DBOS } from '@dbos-inc/dbos-sdk';
import { activate, approve, pool, publishApprovalWakeup } from './business.ts';
import { isRelease, isRequest, type Input } from './protocol.ts';

const emit = (event: string, data: Record<string, unknown> = {}) => process.send?.({ event, ...data });
const checkpoint = DBOS.registerStep(async (runID: string, stage: string) => { emit(stage, { runID }); return stage; }, { name: 'spikeCheckpoint' });
const effect = DBOS.registerStep(async (input: Input) => {
  if (input.pauseBeforeCommit === true && process.env.PAUSE_BEFORE_COMMIT === 'true') {
    emit('before-business-command', { runID: input.runID });
    await new Promise<void>((resolve) => {
      const listener = (m: unknown) => { if (isRelease(m)) { process.off('message', listener); resolve(); } };
      process.on('message', listener);
    });
  }
  const result = await activate(input.runID, `${input.runID}:activate`, Number(process.env.GENERATION ?? input.generation ?? 1));
  emit('business-committed', { runID: input.runID, result });
  if (process.env.CRASH_AFTER_COMMIT === input.runID) {await new Promise(() => {});}
  return result;
}, { name: 'featureActivation', retriesAllowed: false });
const incompatible = DBOS.registerStep(async () => 'incompatible-insert', { name: 'newIncompatibleStep' });

async function original(input: Input) {
  await checkpoint(input.runID, 'started');
  if (input.delayMs!==undefined && input.delayMs>0) {await DBOS.sleepms(input.delayMs);}
  await checkpoint(input.runID, 'waiting');
  const message = await DBOS.recv<string>('approval', 120);
  if (message === null) {throw new Error('approval timeout');}
  const result = await effect(input);
  const duplicate = input.duplicate===true ? await DBOS.recv<string>('approval', 0.3) : null;
  return { result, duplicate };
}
async function compatible(input: Input) {
  // Source changes while durable operation order and names remain stable.
  await checkpoint(input.runID, 'started');
  if (input.delayMs!==undefined && input.delayMs>0) {await DBOS.sleepms(input.delayMs);}
  await checkpoint(input.runID, 'waiting');
  const message = await DBOS.recv<string>('approval', 120);
  if (message === null) {throw new Error('approval timeout');}
  const result = await effect(input);
  const duplicate = input.duplicate===true ? await DBOS.recv<string>('approval', 0.3) : null;
  return { result, duplicate, compatibleCodeRevision: 2 };
}
async function broken(input: Input) {
  await incompatible();
  return original(input);
}
async function patched(input: Input) {
  if (await DBOS.patch('insert-new-step')) {await incompatible();}
  return original(input);
}
const selected = process.env.CODE_REVISION ?? 'original';
const workflow = DBOS.registerWorkflow(selected === 'compatible' ? compatible : selected === 'broken' ? broken : selected === 'patched' ? patched : original,
  { name: 'teamActivation', maxRecoveryAttempts: 10 });

const databaseURL = process.env.DATABASE_URL;
if (databaseURL===undefined || databaseURL==='') { throw new Error('DATABASE_URL is required for this disposable worker'); }
const config: Parameters<typeof DBOS.setConfig>[0] = {
  name: 'od035-dbos-oss', systemDatabaseUrl: databaseURL,
  systemDatabaseSchemaName: process.env.DBOS_SCHEMA ?? 'dbos_oss_spike',
  executorID: process.env.EXECUTOR_ID ?? 'supervisor-owned-executor',
  systemDatabasePoolSize: 4, systemDatabasePollingConcurrency: 2,
  maxConcurrentQueueDispatches: 1, runMigrations: process.env.RUN_MIGRATIONS === 'true',
  enablePatching: process.env.PATCHING === 'true', logLevel: 'warn', tracingEnabled: false,
};
if (process.env.APP_VERSION!==undefined && process.env.APP_VERSION!=='') {config.applicationVersion = process.env.APP_VERSION;}
DBOS.setConfig(config);
await DBOS.launch();
if (process.env.QUEUE_TEST === 'true') {
  await DBOS.registerQueue('spike-waiting', { workerConcurrency: 2, globalConcurrency: 2, minPollingIntervalMs: 20 });
  await DBOS.registerQueue('spike-control', { workerConcurrency: 1, globalConcurrency: 1, minPollingIntervalMs: 20 });
}
emit('ready', { applicationVersion: DBOS.applicationVersion, executorID: DBOS.executorID });
async function handleMessage(message: unknown) {
  if (!isRequest(message)) {return;}
  const m = message;
  try {
    let result: unknown;
    if (m.op === 'start') {result = (await DBOS.startWorkflow(workflow, { workflowID: m.input.runID, ...(m.queueName!==undefined && m.queueName!=='' ? {queueName:m.queueName} : {}) })(m.input)).workflowID;}
    if (m.op === 'approve') {
      result = await approve(m.runID, `${m.runID}:approve`);
      emit('approval-committed', { runID: m.runID });
      if (process.env.CRASH_BEFORE_SEND === m.runID) {await new Promise(() => {});}
      await publishApprovalWakeup(m.runID, async (id, key) => DBOS.send(id, 'approved', 'approval', key));
    }
    if (m.op === 'dispatch-approval') {result = await publishApprovalWakeup(m.runID, async (id, key) => DBOS.send(id, 'approved', 'approval', key));}
    if (m.op === 'send') { await DBOS.send(m.runID, 'approved', 'approval', m.key); result = true; }
    if (m.op === 'status') {result = await DBOS.getWorkflowStatus(m.runID);}
    if (m.op === 'steps') {result = await DBOS.listWorkflowSteps(m.runID);}
    if (m.op === 'cancel') { await DBOS.cancelWorkflow(m.runID); result = true; }
    if (m.op === 'delete') { await DBOS.deleteWorkflows(m.runIDs); result = true; }
    if (m.op === 'quit') { await DBOS.shutdown({ workflowCompletionTimeoutMS: 500 }); await pool.end(); emit('reply', { requestID: m.requestID, result: true }); process.exit(0); }
    emit('reply', { requestID: m.requestID, result });
  } catch (e) { emit('reply', { requestID: m.requestID, error: String(e) }); }
}
process.on('message', (message: unknown) => {void handleMessage(message);});
