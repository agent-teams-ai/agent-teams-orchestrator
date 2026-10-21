import { SandboxActivityError } from '../application/api.js';
import { randomUUID } from 'node:crypto';
import type { Pool,PoolClient } from 'pg';
import type { ActivityEvidence,ActivityRequestContext,ActivityRuntimeBinding,SandboxActivityApi } from '../application/api.js';
import type { ActivityAuthorization } from '../application/ports/activity-store.js';
import { createActivityAdmission } from '../application/admit-sandbox-activity.js';
import { createActivityApi } from '../application/create-activity-api.js';
import { createPostgresActivityStore } from '../adapters/outbound/persistence/postgres-activity-store.js';
import { activitySqlInstant } from '../adapters/outbound/persistence/postgres-transaction.js';
import { createActivityCursorCodec } from '../adapters/outbound/persistence/activity-cursors.js';
import { sandboxActivityMigration } from '../adapters/outbound/persistence/migrations/0001-sandbox-activity.js';
export interface SandboxActivityOptions {
  readonly pool:Pool;readonly migrationPool:Pool;readonly authorization:ActivityAuthorization;readonly clock:{readonly now:()=>string};
  readonly cursorKey:Uint8Array;readonly readTokenLifetimeMicroseconds:string;readonly maxSourceEvents:number;readonly retainedFeedEvents:number;readonly nextId?:()=>string;
}
export interface SandboxActivityFeature {
  readonly api:SandboxActivityApi;
  migrate():Promise<void>;
  bindRuntime(context:ActivityRequestContext,binding:ActivityRuntimeBinding):Promise<void>;
  append(context:ActivityRequestContext,evidence:ActivityEvidence):Promise<{readonly status:'accepted'|'duplicate';readonly sequence:string}>;
}
export function createSandboxActivityFeature(options:SandboxActivityOptions):SandboxActivityFeature {
  if(!/^[1-9][0-9]*$/u.test(options.readTokenLifetimeMicroseconds)||BigInt(options.readTokenLifetimeMicroseconds)>9223372036854775807n||
      ![options.maxSourceEvents,options.retainedFeedEvents].every(value=>Number.isSafeInteger(value)&&value>0)||options.retainedFeedEvents>options.maxSourceEvents) {throw new TypeError('Invalid bounded Activity configuration');}
  activitySqlInstant(options.clock.now());
  const store=createPostgresActivityStore({pool:options.pool,clock:{now:()=>options.clock.now(),lifetime:options.readTokenLifetimeMicroseconds,nextId:options.nextId??randomUUID},
    maxSourceEvents:options.maxSourceEvents,retainedFeedEvents:options.retainedFeedEvents,cursors:createActivityCursorCodec(options.cursorKey)});
  return Object.freeze({
    api:createActivityApi({store,authorization:options.authorization}),
    async migrate(){
      let client:PoolClient;
      try{client=await options.migrationPool.connect();}catch{throw new SandboxActivityError('UNAVAILABLE','Migration connection is unavailable');}
      const health={broken:false};let committing=false;
      const onError=()=>{health.broken=true;};client.on('error',onError);
      const isBroken=()=>health.broken;
      try{
        await client.query('BEGIN');await client.query(sandboxActivityMigration);
        if(isBroken()){throw new SandboxActivityError('UNAVAILABLE','Migration connection was interrupted');}
        committing=true;await client.query('COMMIT');
        if(isBroken()){throw new SandboxActivityError('UNAVAILABLE','Migration commit requires reconciliation');}
      }catch{
        if(committing){health.broken=true;}else{try{await client.query('ROLLBACK');}catch{health.broken=true;}}
        throw new SandboxActivityError('UNAVAILABLE','Migration requires same-identity reconciliation');
      }finally{client.removeListener('error',onError);client.release(isBroken());}
    },
    ...createActivityAdmission({store,authorization:options.authorization}),
  });
}
