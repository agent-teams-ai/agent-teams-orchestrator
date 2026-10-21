import type { Pool, PoolClient } from 'pg';
import { ActivityAdmissionError } from '../../../domain/activity-admission.js';
import { SandboxActivityError } from '../../../application/api.js';
import type { ActivityRequestContext } from '../../../application/api.js';
export async function activityTransaction<T>(pool: Pool, context: ActivityRequestContext, work: (client: PoolClient) => Promise<T>,readOnly=false): Promise<T> {
  let client:PoolClient;
  try{client=await pool.connect();}catch{throw new SandboxActivityError('UNAVAILABLE','Observation connection is unavailable');}
  let committing=false; const health={broken:false};
  const onError=()=>{health.broken=true;};client.on('error',onError);
  const isBroken=()=>health.broken;
  try {
    await client.query(readOnly?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('statement_timeout','5000',true),set_config('lock_timeout','3000',true)",[context.tenantId]);
    const result=await work(client);
    if(isBroken()){throw new SandboxActivityError('UNAVAILABLE','Observation connection was interrupted');}
    committing=true; await client.query('COMMIT');
    if(isBroken()){throw new SandboxActivityError('UNAVAILABLE','Observation commit requires same-source reconciliation');}
    return result;
  } catch(error) {
    if(committing) {health.broken=true;}
    else { try { await client.query('ROLLBACK'); } catch {health.broken=true;} }
    if(!isBroken() && error instanceof ActivityAdmissionError){throw new SandboxActivityError(error.code,error.message);}
    if(!isBroken() && error instanceof SandboxActivityError) {throw error;}
    throw new SandboxActivityError('UNAVAILABLE','Observation persistence requires same-source reconciliation');
  } finally {client.removeListener('error',onError);client.release(isBroken());}
}
export function activitySqlInstant(value:string):string {
  if(!/^-?(?:0|[1-9][0-9]*)$/u.test(value) || value==='-0') {throw new SandboxActivityError('INVALID_ARGUMENT','Invalid exact instant');}
  const us=BigInt(value);
  if(us < -62135596800000000n || us > 253402300799999999n) {throw new SandboxActivityError('INVALID_ARGUMENT','Instant outside public calendar range');}
  const seconds=us<0n?(us-999999n)/1000000n:us/1000000n;
  return `${new Date(Number(seconds*1000n)).toISOString().slice(0,19)}.${(us-seconds*1000000n).toString().padStart(6,'0')}Z`;
}
