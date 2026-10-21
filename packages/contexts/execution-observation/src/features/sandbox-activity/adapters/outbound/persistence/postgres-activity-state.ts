import type { PoolClient } from 'pg';
import { SandboxActivityError } from '../../../application/api.js';
import type { ActivityRequestContext } from '../../../application/api.js';
import type { ActivityState } from '../../../domain/activity-state.js';
import { isActivityState } from '../../../domain/state-codec.js';
export async function readActivityState(client:PoolClient,context:ActivityRequestContext,run:string,lock=false):Promise<ActivityState> {
  const result=await client.query<{state:unknown}>(`SELECT state FROM execution_observation.partitions WHERE tenant_id=$1 AND project_id=$2 AND run=$3${lock?' FOR UPDATE':''}`,[context.tenantId,context.projectId,run]);
  const state=result.rows[0]?.state;
  if(state===undefined) {throw new SandboxActivityError('NOT_FOUND','No registered Activity runtime binding for this Run');}
  if(!isActivityState(state) || state.binding.run!==run) {throw new SandboxActivityError('UNAVAILABLE','Stored Activity state is inconsistent');}
  return state;
}
export async function saveActivityState(client:PoolClient,context:ActivityRequestContext,state:ActivityState):Promise<void> {
  await client.query('UPDATE execution_observation.partitions SET state=$4::jsonb WHERE tenant_id=$1 AND project_id=$2 AND run=$3',[context.tenantId,context.projectId,state.binding.run,JSON.stringify(state)]);
}
