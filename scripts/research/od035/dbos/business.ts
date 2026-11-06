import { Pool } from 'pg';
export type FeatureRun = {id:string;approved:boolean;counter:number;generation:number};
type ApprovalResult = {approved:true;commandID:string};
type ActivationResult = {activated:true;commandID:string} | {fenced:true};

// Feature-owned PostgreSQL persistence. This file has no workflow-engine import.
export const pool = new Pool({ connectionString: process.env.BUSINESS_DATABASE_URL ?? process.env.DATABASE_URL, max: 3 });
export async function setup() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS dbos_spike_business;
    CREATE TABLE IF NOT EXISTS dbos_spike_business.runs (
      id text PRIMARY KEY, approved boolean NOT NULL DEFAULT false,
      counter integer NOT NULL DEFAULT 0, generation integer NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS dbos_spike_business.receipts (
      command_id text PRIMARY KEY, run_id text NOT NULL, result jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS dbos_spike_business.approval_outbox (
      id text PRIMARY KEY, run_id text NOT NULL, published boolean NOT NULL DEFAULT false);
    CREATE TABLE IF NOT EXISTS dbos_spike_business.attempts (
      id bigserial PRIMARY KEY, run_id text NOT NULL, kind text NOT NULL,
      generation integer NOT NULL, accepted boolean NOT NULL, observed_at timestamptz NOT NULL DEFAULT now());`);
}
export async function createRun(id: string) {
  await pool.query('INSERT INTO dbos_spike_business.runs(id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
}
export async function approve(id: string, commandID: string) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT id FROM dbos_spike_business.runs WHERE id=$1 FOR UPDATE', [id]);
    const existing = (await c.query<{result:ApprovalResult}>('SELECT result FROM dbos_spike_business.receipts WHERE command_id=$1', [commandID])).rows.at(0);
    if (existing !== undefined) { await c.query('COMMIT'); return existing.result; }
    await c.query('UPDATE dbos_spike_business.runs SET approved=true WHERE id=$1', [id]);
    const result:ApprovalResult = { approved: true, commandID };
    await c.query('INSERT INTO dbos_spike_business.receipts VALUES ($1,$2,$3)', [commandID, id, result]);
    await c.query('INSERT INTO dbos_spike_business.approval_outbox(id,run_id) VALUES ($1,$2)', [`${id}:approval-wakeup`, id]);
    await c.query('COMMIT');
    return result;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
// Feature dispatch uses a consumer-owned function port; the engine adapter supplies send.
export async function publishApprovalWakeup(id: string, send: (runID: string, messageID: string) => Promise<void>) {
  const pending = await pool.query<{ id: string }>('SELECT id FROM dbos_spike_business.approval_outbox WHERE run_id=$1 AND NOT published', [id]);
  for (const row of pending.rows) {
    await send(id, row.id);
    await pool.query('UPDATE dbos_spike_business.approval_outbox SET published=true WHERE id=$1', [row.id]);
  }
  return pending.rowCount;
}
export async function activate(id: string, commandID: string, generation: number) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const row = (await c.query<FeatureRun>('SELECT * FROM dbos_spike_business.runs WHERE id=$1 FOR UPDATE', [id])).rows.at(0);
    if(row===undefined){throw new Error('Feature run does not exist');}
    const accepted = row.generation === generation;
    await c.query('INSERT INTO dbos_spike_business.attempts(run_id,kind,generation,accepted) VALUES ($1,$2,$3,$4)', [id, 'activation', generation, accepted]);
    if (!accepted) { await c.query('COMMIT'); return { fenced: true } satisfies ActivationResult; }
    const existing = (await c.query<{result:ActivationResult}>('SELECT result FROM dbos_spike_business.receipts WHERE command_id=$1', [commandID])).rows.at(0);
    if (existing!==undefined) { await c.query('COMMIT'); return existing.result; }
    if (!row.approved) {throw new Error('Feature rejected activation without authoritative approval');}
    const result:ActivationResult = { activated: true, commandID };
    await c.query('UPDATE dbos_spike_business.runs SET counter=counter+1 WHERE id=$1', [id]);
    await c.query('INSERT INTO dbos_spike_business.receipts VALUES ($1,$2,$3)', [commandID, id, result]);
    await c.query('COMMIT');
    return result;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
