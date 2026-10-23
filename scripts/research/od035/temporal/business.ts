import { Pool } from 'pg';
import { activationDecision, type ActivationState } from './domain.ts';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const schema = 'temporal_spike_business';

export async function migrate(): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema};
    CREATE TABLE IF NOT EXISTS ${schema}.runs (
      id text PRIMARY KEY, approved boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'waiting', effects integer NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ${schema}.receipts (
      run_id text NOT NULL, command_id text NOT NULL, kind text NOT NULL,
      PRIMARY KEY(run_id, command_id));
    CREATE TABLE IF NOT EXISTS ${schema}.attempts (
      run_id text NOT NULL, worker_pid integer NOT NULL,
      observed_at timestamptz NOT NULL DEFAULT now());`);
}

export async function createRun(id: string): Promise<void> {
  await pool.query(`INSERT INTO ${schema}.runs(id) VALUES($1)`, [id]);
}

export async function approve(id: string, commandId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO ${schema}.receipts VALUES($1,$2,'approve') ON CONFLICT DO NOTHING`, [id, commandId]);
    await client.query(`UPDATE ${schema}.runs SET approved=true WHERE id=$1`, [id]);
    await client.query('COMMIT');
  } finally { client.release(); }
}

export async function readState(id: string): Promise<ActivationState> {
  const result = await pool.query<ActivationState>(`SELECT approved,status,effects FROM ${schema}.runs WHERE id=$1`, [id]);
  const state = result.rows[0];
  if (!state) { throw new Error(`Unknown feature run ${id}`); }
  return state;
}

export async function activate(id: string, commandId: string): Promise<ActivationState> {
  // Attempts deliberately record retry evidence independently from command acceptance.
  await pool.query(`INSERT INTO ${schema}.attempts(run_id,worker_pid) VALUES($1,$2)`, [id, process.pid]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await client.query<ActivationState>(`SELECT approved,status,effects FROM ${schema}.runs WHERE id=$1 FOR UPDATE`, [id]);
    const state = row.rows[0];
    if (!state) { throw new Error(`Unknown feature run ${id}`); }
    const receipt = await client.query(`SELECT 1 FROM ${schema}.receipts WHERE run_id=$1 AND command_id=$2`, [id, commandId]);
    if (receipt.rowCount === 0 && activationDecision(state) === 'activate') {
      await client.query(`INSERT INTO ${schema}.receipts VALUES($1,$2,'activate')`, [id, commandId]);
      await client.query(`UPDATE ${schema}.runs SET status='active',effects=effects+1 WHERE id=$1`, [id]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return readState(id);
}

export async function cancel(id: string): Promise<void> {
  await pool.query(`UPDATE ${schema}.runs SET status='cancelled' WHERE id=$1 AND status='waiting'`, [id]);
}

export async function timerFired(id: string): Promise<void> {
  await pool.query(`UPDATE ${schema}.runs SET status='timer-fired' WHERE id=$1`, [id]);
}

export async function evidence(id: string) {
  const state = await readState(id);
  const receipts = await pool.query<{ command_id: string; kind: string }>(`SELECT command_id,kind FROM ${schema}.receipts WHERE run_id=$1 ORDER BY command_id`, [id]);
  const attempts = await pool.query<{ worker_pid: number; observed_at: Date }>(`SELECT worker_pid,observed_at FROM ${schema}.attempts WHERE run_id=$1 ORDER BY observed_at`, [id]);
  return { state, receipts: receipts.rows, attempts: attempts.rows };
}
