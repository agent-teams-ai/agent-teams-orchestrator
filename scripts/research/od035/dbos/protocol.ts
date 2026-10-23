export type Input = { runID: string; delayMs?: number; duplicate?: boolean; generation?: number; pauseBeforeCommit?: boolean };
export type Request = { requestID: number } & (
  { op: 'start'; input: Input; queueName?: string } |
  { op: 'approve' | 'send' | 'dispatch-approval' | 'status' | 'steps' | 'cancel'; runID: string; key?: string } |
  { op: 'delete'; runIDs: string[] } | { op: 'quit' }
);
export type Release = { op: 'release-effect' };
export type EngineOutput = { result?: { activated?: boolean; commandID?: string; fenced?: boolean }; duplicate?: string | null; compatibleCodeRevision?: number };
export type Status = {status:string;output:EngineOutput;error?:unknown};
export type Step = {name:string;output:unknown};
export type ExecutorEvent = { event: string; runID?: string; applicationVersion?: string; executorID?: string; requestID?: number; error?: string; result?: unknown };
export function isRelease(value: unknown): value is Release {
  return typeof value === 'object' && value !== null && 'op' in value && value.op === 'release-effect';
}
export function isEvent(value: unknown): value is ExecutorEvent {
  return typeof value === 'object' && value !== null && 'event' in value && typeof value.event === 'string';
}
export function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function isInput(value:unknown):value is Input{
  return isRecord(value)&&typeof value.runID==='string'&&
    (value.delayMs===undefined||typeof value.delayMs==='number')&&
    (value.duplicate===undefined||typeof value.duplicate==='boolean')&&
    (value.generation===undefined||typeof value.generation==='number')&&
    (value.pauseBeforeCommit===undefined||typeof value.pauseBeforeCommit==='boolean');
}
export function isRequest(value:unknown):value is Request{
  if(!isRecord(value)||typeof value.requestID!=='number'){return false;}
  if(value.op==='start'){return isInput(value.input)&&(value.queueName===undefined||typeof value.queueName==='string');}
  if(value.op==='quit'){return true;}
  if(value.op==='delete'){return Array.isArray(value.runIDs)&&value.runIDs.every((id:unknown)=>typeof id==='string');}
  return ['approve','send','dispatch-approval','status','steps','cancel'].some(op=>op===value.op)&&typeof value.runID==='string'&&(value.key===undefined||typeof value.key==='string');
}
export function isEngineOutput(value:unknown):value is EngineOutput{
  if(!isRecord(value)){return false;}
  if(value.result!==undefined){
    if(!isRecord(value.result)){return false;}
    if(value.result.activated!==undefined&&typeof value.result.activated!=='boolean'){return false;}
    if(value.result.fenced!==undefined&&typeof value.result.fenced!=='boolean'){return false;}
    if(value.result.commandID!==undefined&&typeof value.result.commandID!=='string'){return false;}
  }
  return (value.duplicate===undefined||value.duplicate===null||typeof value.duplicate==='string')&&
    (value.compatibleCodeRevision===undefined||typeof value.compatibleCodeRevision==='number');
}
export function isSteps(value:unknown):value is Step[]{
  return Array.isArray(value)&&value.every((entry:unknown)=>isRecord(entry)&&typeof entry.name==='string'&&'output' in entry);
}
