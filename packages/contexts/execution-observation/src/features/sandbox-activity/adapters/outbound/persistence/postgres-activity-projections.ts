import type { PoolClient } from 'pg';
import { SandboxActivityError } from '../../../application/api.js';
import type { ActivityFeedPage, ActivityRequestContext, ActivitySnapshot } from '../../../application/api.js';
import type { ActivityGrant } from '../../../application/ports/activity-store.js';
import { readActivityState } from './postgres-activity-state.js';
import { getActivityToken, putActivityToken } from './postgres-read-tokens.js';
import {projectActivity} from '../../../domain/activity-state.js';
import type {ActivityFact} from '../../../domain/activity-state.js';
import type { ActivityReadClock, ActivityReadToken,ActivityCursorCodec } from './postgres-read-tokens.js';
function freshToken(context:ActivityRequestContext,run:string,sequence:string,grant:ActivityGrant,gap:boolean):Omit<ActivityReadToken,'expiresAt'> {
  return {kind:'feed',principalId:context.principalId,epoch:grant.epoch,allowInternal:grant.allowInternal,run,position:sequence,watermark:sequence,offset:'0',gap};
}
export async function activitySnapshot(client:PoolClient,context:ActivityRequestContext,input:{run:string;pageSize:number;pageToken?:string},grant:ActivityGrant,dependencies:{clock:ActivityReadClock;cursors:ActivityCursorCodec}):Promise<ActivitySnapshot> {
  const {clock,cursors}=dependencies;
  const state=await readActivityState(client,context,input.run);
  const stored=input.pageToken===undefined?undefined:getActivityToken(context,{token:input.pageToken,run:input.run,kind:'snapshot'},grant,clock,cursors);
  const expired=input.pageToken!==undefined && !stored;
  const current=freshToken(context,input.run,state.sequence,grant,state.gap||expired);
  const snapshot=stored??{...current,kind:'snapshot' as const};
  if(BigInt(snapshot.watermark)>BigInt(state.history.length)){throw new SandboxActivityError('UNAVAILABLE','Stored Activity snapshot is inconsistent');}
  const visible=state.history.slice(0,Number(snapshot.watermark)).reduce<readonly ActivityFact[]>((items,fact)=>projectActivity(items,fact),[]).filter(item=>grant.allowInternal||!item.internal);
  if(BigInt(snapshot.offset)>BigInt(visible.length)){throw new SandboxActivityError('UNAVAILABLE','Stored Activity snapshot is inconsistent');}
  const offset=Number(snapshot.offset);const items=visible.slice(offset,offset+input.pageSize);
  const cursor=putActivityToken({...snapshot,kind:'feed',position:snapshot.watermark,offset:'0'},clock,cursors);
  const next=offset+items.length;
  const nextPageToken=next<visible.length?putActivityToken({...snapshot,offset:String(next)},clock,cursors):undefined;
  return {items,watermark:snapshot.watermark,cursor,freshness:snapshot.gap?'incomplete':'current',gap:snapshot.gap,...(nextPageToken===undefined?{}:{nextPageToken})};
}
export async function activityFeed(client:PoolClient,context:ActivityRequestContext,input:{run:string;pageSize:number;cursor?:string},grant:ActivityGrant,dependencies:{clock:ActivityReadClock;cursors:ActivityCursorCodec}):Promise<ActivityFeedPage> {
  const {clock,cursors}=dependencies;
  const state=await readActivityState(client,context,input.run);
  const stored=input.cursor===undefined?freshToken(context,input.run,state.sequence,grant,state.gap):getActivityToken(context,{token:input.cursor,run:input.run,kind:'feed'},grant,clock,cursors);
  const oldest=BigInt(state.events[0]?.sequence??(BigInt(state.sequence)+1n));
  const gap=!stored||BigInt(stored.position)<oldest-1n||BigInt(stored.position)>BigInt(state.sequence)||BigInt(state.gapSequence)>BigInt(stored.watermark);
  if(gap) {return {events:[],gap:true,nextCursor:putActivityToken(freshToken(context,input.run,state.sequence,grant,true),clock,cursors)};}
  const visible=state.events.filter(item=>BigInt(item.sequence)>BigInt(stored.position)&&(grant.allowInternal||!item.internal));
  const selected=visible.slice(0,input.pageSize);
  const position=selected.length===visible.length?state.sequence:selected.at(-1)?.sequence??state.sequence;
  const events=selected.map(({eventId,resourceName,change,sequence})=>({eventId,resourceName,change,sequence}));
  return {events,gap:false,nextCursor:putActivityToken(freshToken(context,input.run,position,grant,state.gap),clock,cursors)};
}
