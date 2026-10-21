import type { Pool, PoolClient } from 'pg';
import { SandboxManifestError } from '../../../application/api.js';
import type { ManifestRequestContext } from '../../../application/api.js';
import type { ManifestStore } from '../../../application/ports/manifest-store.js';
import { assertManifest } from '../../../application/manifest-validation.js';
import { manifestFingerprint } from '../../../domain/manifest.js';
import type { ManifestFacts } from '../../../domain/manifest.js';
function sqlInstant(value: string): string {
  const us = BigInt(value);
  if (us < -62135596800000000n || us > 253402300799999999n) {throw new SandboxManifestError('INVALID_ARGUMENT', 'Manifest instant outside public calendar range');}
  const seconds = us < 0n ? (us - 999999n) / 1000000n : us / 1000000n;
  return `${new Date(Number(seconds * 1000n)).toISOString().slice(0,19)}.${(us - seconds * 1000000n).toString().padStart(6,'0')}Z`;
}
async function transaction<T>(pool: Pool, context: ManifestRequestContext, work: (client: PoolClient) => Promise<T>,readOnly=false): Promise<T> {
  const client = await pool.connect().catch(() => {throw new SandboxManifestError('UNAVAILABLE', 'Manifest persistence requires same-identity reconciliation');}); let committing = false; const health = {broken:false};
  const onError = () => {health.broken=true;};client.on('error',onError);
  const isBroken=()=>health.broken;
  try {
    await client.query(readOnly?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('statement_timeout','5000',true),set_config('lock_timeout','3000',true)", [context.tenantId]);
    const result = await work(client);
    if(isBroken()){throw new SandboxManifestError('UNAVAILABLE','Manifest connection was interrupted');}
    committing = true;
    await client.query('COMMIT');
    if(isBroken()){throw new SandboxManifestError('UNAVAILABLE','Manifest commit requires same-identity reconciliation');}
    return result;
  } catch (error) {
    if (committing) {health.broken = true;}
    else { try { await client.query('ROLLBACK'); } catch { health.broken = true; } }
    if (!isBroken() && error instanceof SandboxManifestError) {throw error;}
    throw new SandboxManifestError('UNAVAILABLE', 'Manifest persistence requires same-identity reconciliation');
  } finally { client.removeListener('error',onError);client.release(isBroken()); }
}
function storedManifest(value: unknown): value is ManifestFacts {
  if (value === null || typeof value !== 'object') {return false;}
  return 'name' in value && typeof value.name === 'string' && 'workspace' in value && typeof value.workspace === 'string' &&
    'agentProfileVersion' in value && typeof value.agentProfileVersion === 'string' && 'runPolicySnapshot' in value && typeof value.runPolicySnapshot === 'string' &&
    'instructionRef' in value && typeof value.instructionRef === 'string' && 'createdAt' in value && typeof value.createdAt === 'string' &&
    (!('roleKey' in value) || typeof value.roleKey === 'string') && (!('workSnapshotRef' in value) || typeof value.workSnapshotRef === 'string');
}
export function createPostgresManifestStore(pool: Pool, nextId: () => string): ManifestStore {
  return {
    read: (context, name) => transaction(pool, context, async client => {
      const {rows} = await client.query<{facts: unknown; fingerprint: string}>('SELECT facts,fingerprint FROM agent_context.manifests WHERE tenant_id=$1 AND project_id=$2 AND name=$3',[context.tenantId,context.projectId,name]);
      const row=rows[0]; if (!row) {return;}
      if (!storedManifest(row.facts)) {throw new SandboxManifestError('UNAVAILABLE','Stored manifest is invalid');}
      assertManifest(context,row.facts);
      if (row.facts.name !== name || row.fingerprint !== manifestFingerprint(row.facts)) {throw new SandboxManifestError('UNAVAILABLE','Stored manifest identity is inconsistent');}
      return structuredClone(row.facts);
    },true),
    seed: (context, manifest) => transaction(pool, context, async client => {
      const fingerprint = manifestFingerprint(manifest);
      const inserted = await client.query('INSERT INTO agent_context.manifests (tenant_id,project_id,name,fingerprint,facts,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6::timestamptz) ON CONFLICT DO NOTHING RETURNING name',
        [context.tenantId,context.projectId,manifest.name,fingerprint,JSON.stringify(manifest),sqlInstant(manifest.createdAt)]);
      const {rows} = await client.query<{fingerprint:string}>('SELECT fingerprint FROM agent_context.manifests WHERE tenant_id=$1 AND project_id=$2 AND name=$3',[context.tenantId,context.projectId,manifest.name]);
      if (rows[0]?.fingerprint !== fingerprint) {throw new SandboxManifestError('CONFLICT','Immutable manifest name has different facts');}
      if (inserted.rowCount !== null && inserted.rowCount > 0) {await client.query('INSERT INTO agent_context.outbox (tenant_id,project_id,event_id,resource_name,kind) VALUES ($1,$2,$3,$4,$5)',[context.tenantId,context.projectId,nextId(),manifest.name,'SandboxManifestCreated']);}
    }),
  };
}
