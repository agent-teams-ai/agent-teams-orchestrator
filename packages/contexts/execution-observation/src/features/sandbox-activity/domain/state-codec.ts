import type { ActivityFact, ActivityState, FeedFact, RuntimeBinding } from './activity-state.js';
const object=(value:unknown):value is Record<string,unknown>=>value!==null && typeof value==='object' && !Array.isArray(value);
const exact=(value:unknown):value is string=>typeof value==='string' && /^(?:0|[1-9][0-9]*)$/u.test(value) && BigInt(value)<=9223372036854775807n;
function binding(value:unknown):value is RuntimeBinding {
  return object(value) && typeof value.run==='string' && typeof value.participant==='string' && typeof value.runtimeSessionRef==='string' &&
    (value.task===undefined || typeof value.task==='string');
}
export function isActivityFact(value:unknown):value is ActivityFact {
  return object(value) && typeof value.eventId==='string' && typeof value.run==='string' && typeof value.participant==='string' && typeof value.text==='string' && typeof value.internal==='boolean' &&
    typeof value.blockId==='string' && typeof value.recordedAt==='string' && /^-?(?:0|[1-9][0-9]*)$/u.test(value.recordedAt) &&
    typeof value.kind==='string' && ['TEXT_DELTA','TEXT_SNAPSHOT','TEXT_COMPLETE','TOOL','DIAGNOSTIC'].includes(value.kind) &&
    (value.task===undefined || typeof value.task==='string') && (value.runtimeOperationRef===undefined || typeof value.runtimeOperationRef==='string');
}
function feed(value:unknown):value is FeedFact {
  return object(value) && typeof value.eventId==='string' && typeof value.resourceName==='string' && value.change==='upsert' && exact(value.sequence) && typeof value.internal==='boolean';
}
function receipt(value:unknown):value is ActivityState['receipts'][number] {
  return object(value) && typeof value.sourceEventId==='string' && typeof value.fingerprint==='string' && exact(value.sequence);
}
function stateHead(value:Record<string,unknown>):value is Record<string,unknown>&Pick<ActivityState,'sequence'|'sourceSequence'|'gapSequence'|'gap'> {
  return exact(value.sequence)&&exact(value.sourceSequence)&&exact(value.gapSequence)&&typeof value.gap==='boolean';
}
export function isActivityState(value:unknown):value is ActivityState {
  if(!object(value) || !binding(value.binding) || !stateHead(value) ||
      !Array.isArray(value.items) || !value.items.every(isActivityFact) || !Array.isArray(value.history) || !value.history.every(isActivityFact) || !Array.isArray(value.events) || !value.events.every(feed) ||
      !Array.isArray(value.receipts) || !value.receipts.every(receipt)) {return false;}
  const bound=value.binding; const run=bound.run; const sequence=value.sequence; const events=value.events; const receipts=value.receipts; const history=value.history;
  return BigInt(sequence)===BigInt(receipts.length) && BigInt(value.sourceSequence)>=BigInt(sequence) && history.length===receipts.length && BigInt(value.gapSequence)<=BigInt(sequence) && value.items.every(item=>item.run===run && item.participant===bound.participant && item.task===bound.task) &&
    history.every(item=>item.run===run && item.participant===bound.participant && item.task===bound.task) &&
    value.events.every((event,index)=>event.resourceName===run && BigInt(event.sequence)<=BigInt(sequence) &&
      (index===0 || BigInt(event.sequence)===BigInt(events[index-1]?.sequence??'0')+1n)) &&
    new Set(receipts.map(item=>item.sourceEventId)).size===receipts.length &&
    receipts.every((item,index)=>BigInt(item.sequence)===BigInt(index)+1n);
}
