import {bindingFingerprint,evidenceFingerprint,projectActivity} from './activity-state.js';
import type {ActivityFact,ActivityState,Evidence,RuntimeBinding} from './activity-state.js';
export class ActivityAdmissionError extends Error {
  constructor(readonly code:'PERMISSION_DENIED'|'STALE'|'CONFLICT'|'RESOURCE_EXHAUSTED',message:string){super(message);this.name='ActivityAdmissionError';}
}
export function assertRuntimeBinding(state:ActivityState,value:RuntimeBinding):void {
  if(bindingFingerprint(state.binding)!==bindingFingerprint(value)) {throw new ActivityAdmissionError('PERMISSION_DENIED','Evidence does not match the registered Run/runtime binding');}
}
export function admitActivity(state:ActivityState,value:Evidence,metadata:{eventId:string;recordedAt:string},options:{maxSourceEvents:number;retainedFeedEvents:number}):{status:'accepted';state:ActivityState;activity:ActivityFact}|{status:'duplicate';sequence:string} {
  const {eventId,recordedAt}=metadata;
  assertRuntimeBinding(state,value);
  const previous=state.receipts.find(item=>item.sourceEventId===value.sourceEventId);
  if(previous){if(previous.fingerprint!==evidenceFingerprint(value)){throw new ActivityAdmissionError('CONFLICT','Source identity was reused with different evidence');}return {status:'duplicate',sequence:previous.sequence};}
  if(BigInt(value.sourceSequence)<=BigInt(state.sourceSequence)) {throw new ActivityAdmissionError('STALE','Late source coordinates cannot change Activity');}
  if(state.receipts.length>=options.maxSourceEvents||BigInt(state.sequence)>=9223372036854775807n) {throw new ActivityAdmissionError('RESOURCE_EXHAUSTED','Activity source receipt budget is full');}
  const sequence=(BigInt(state.sequence)+1n).toString();
  const activity:ActivityFact={eventId,run:value.run,participant:value.participant,kind:value.kind,text:value.text,internal:value.internal,blockId:value.blockId,recordedAt,
    ...(value.task===undefined?{}:{task:value.task}),...(value.runtimeOperationRef===undefined?{}:{runtimeOperationRef:value.runtimeOperationRef})};
  const old=state.items.find(item=>item.blockId===value.blockId&&item.participant===value.participant&&item.runtimeOperationRef===value.runtimeOperationRef);
  if(old?.kind==='TEXT_COMPLETE') {throw new ActivityAdmissionError('STALE','A completed block cannot be reopened by late output');}
  if(old&&old.internal!==value.internal) {throw new ActivityAdmissionError('CONFLICT','Block disclosure cannot change through provider output');}
  const items=projectActivity(state.items,activity);
  if(items.some(item=>item.text.length>16384)) {throw new ActivityAdmissionError('RESOURCE_EXHAUSTED','Activity block text budget is full');}
  return {status:'accepted',activity,state:{...state,sequence,sourceSequence:value.sourceSequence,gap:state.gap||BigInt(value.sourceSequence)!==BigInt(state.sourceSequence)+1n,gapSequence:BigInt(value.sourceSequence)!==BigInt(state.sourceSequence)+1n?sequence:state.gapSequence,items,history:[...state.history,activity],
    events:[...state.events,{eventId,resourceName:value.run,change:'upsert' as const,sequence,internal:value.internal}].slice(-options.retainedFeedEvents),
    receipts:[...state.receipts,{sourceEventId:value.sourceEventId,fingerprint:evidenceFingerprint(value),sequence}]}};
}
