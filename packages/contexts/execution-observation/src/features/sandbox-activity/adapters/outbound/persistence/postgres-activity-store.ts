import type { Pool } from 'pg';
import type { ActivityStore } from '../../../application/ports/activity-store.js';
import { assertRuntimeBinding,admitActivity } from '../../../domain/activity-admission.js';
import type { ActivityState } from '../../../domain/activity-state.js';
import { activityTransaction,activitySqlInstant } from './postgres-transaction.js';
import { readActivityState,saveActivityState } from './postgres-activity-state.js';
import { activityFeed,activitySnapshot } from './postgres-activity-projections.js';
import type { ActivityReadClock,ActivityCursorCodec } from './postgres-read-tokens.js';
export interface ActivityStoreOptions {readonly pool:Pool;readonly clock:ActivityReadClock;readonly maxSourceEvents:number;readonly retainedFeedEvents:number;readonly cursors:ActivityCursorCodec;}
export function createPostgresActivityStore(options:ActivityStoreOptions):ActivityStore {
  const {pool,clock}=options;
  return {
    bind:(context,binding)=>activityTransaction(pool,context,async client=>{
      const empty:ActivityState={binding:structuredClone(binding),sequence:'0',sourceSequence:'0',gap:false,gapSequence:'0',items:[],history:[],events:[],receipts:[]};
      await client.query('INSERT INTO execution_observation.partitions (tenant_id,project_id,run,state) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING',[context.tenantId,context.projectId,binding.run,JSON.stringify(empty)]);
      assertRuntimeBinding(await readActivityState(client,context,binding.run,true),binding);
    }),
    append:(context,value)=>activityTransaction(pool,context,async client=>{
      const state=await readActivityState(client,context,value.run,true);
      const next=admitActivity(state,value,{eventId:clock.nextId(),recordedAt:clock.now()},options);
      if(next.status==='duplicate'){return next;}
      await saveActivityState(client,context,next.state);
      await client.query('INSERT INTO execution_observation.outbox (tenant_id,project_id,event_id,run,sequence,kind,recorded_at) VALUES ($1,$2,$3,$4,$5::bigint,$6,$7::timestamptz)',
        [context.tenantId,context.projectId,next.activity.eventId,value.run,next.state.sequence,'SandboxActivityRecorded',activitySqlInstant(next.activity.recordedAt)]);
      return {status:'accepted' as const,sequence:next.state.sequence};
    }),
    list:(context,input,grant)=>activityTransaction(pool,context,client=>activitySnapshot(client,context,input,grant,{clock,cursors:options.cursors}),true),
    feed:(context,input,grant)=>activityTransaction(pool,context,client=>activityFeed(client,context,input,grant,{clock,cursors:options.cursors}),true),
  };
}
