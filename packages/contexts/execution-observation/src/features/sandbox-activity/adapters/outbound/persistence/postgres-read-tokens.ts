import { SandboxActivityError } from '../../../application/api.js';
import type { ActivityRequestContext } from '../../../application/api.js';
import type { ActivityGrant } from '../../../application/ports/activity-store.js';
export interface ActivityReadToken {
  readonly kind:'snapshot'|'feed';readonly principalId:string;readonly epoch:string;readonly allowInternal:boolean;
  readonly run:string;readonly position:string;readonly watermark:string;readonly offset:string;readonly gap:boolean;readonly expiresAt:string;
}
export interface ActivityReadClock {readonly now:()=>string;readonly lifetime:string;readonly nextId:()=>string;}
export interface ActivityCursorCodec {encode(value:ActivityReadToken):string;decode(value:string):unknown;}
const tokenObject=(value:unknown):value is Record<string,unknown>=>value!==null && typeof value==='object';
const decimal=(value:unknown):boolean=>typeof value==='string' && /^(?:0|[1-9][0-9]*)$/u.test(value);
function tokenIdentity(value:Record<string,unknown>):boolean {
  return (value.kind==='snapshot'||value.kind==='feed') && typeof value.principalId==='string' && typeof value.epoch==='string' &&
    typeof value.allowInternal==='boolean' && typeof value.run==='string' && typeof value.gap==='boolean' && typeof value.expiresAt==='string' && /^-?(?:0|[1-9][0-9]*)$/u.test(value.expiresAt);
}
function tokenShape(value:unknown):value is ActivityReadToken {
  return tokenObject(value) && tokenIdentity(value) && decimal(value.position) && decimal(value.watermark) && decimal(value.offset);
}
export function putActivityToken(data:Omit<ActivityReadToken,'expiresAt'>,clock:ActivityReadClock,cursors:ActivityCursorCodec):string {
  return cursors.encode({...data,expiresAt:(BigInt(clock.now())+BigInt(clock.lifetime)).toString()});
}
export function getActivityToken(context:ActivityRequestContext,input:{token:string;run:string;kind:ActivityReadToken['kind']},grant:ActivityGrant,clock:ActivityReadClock,cursors:ActivityCursorCodec):ActivityReadToken|undefined {
  let decoded:unknown;
  try{decoded=cursors.decode(input.token);}catch{throw new SandboxActivityError('INVALID_ARGUMENT','Invalid authenticated Activity cursor');}
  if(!tokenShape(decoded)||decoded.kind!==input.kind||decoded.run!==input.run||decoded.principalId!==context.principalId){throw new SandboxActivityError('PERMISSION_DENIED','Activity cursor belongs to another authorized query');}
  if(BigInt(decoded.expiresAt)<=BigInt(clock.now())||decoded.epoch!==grant.epoch||decoded.allowInternal!==grant.allowInternal){return;}
  return decoded;
}
