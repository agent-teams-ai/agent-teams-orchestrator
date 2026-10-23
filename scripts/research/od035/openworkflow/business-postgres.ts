import assert from 'node:assert/strict';
import { Pool } from 'pg';
import type { ActivationPort } from './business.ts';
export interface ActivationRecord {id:string;approved:boolean;canceled:boolean;generation:string;counter:string}
export interface TraceRecord {seq:string;event:string;detail:string;created_at:Date}
export class BusinessPostgres implements ActivationPort {
  readonly pool: Pool;
  constructor(url: string) { this.pool = new Pool({ connectionString: url, max: 2 }); }
  async setup() {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ow_business_fixture;
      CREATE TABLE IF NOT EXISTS ow_business_fixture.activations (
        id text PRIMARY KEY, approved boolean NOT NULL DEFAULT false,
        canceled boolean NOT NULL DEFAULT false, generation bigint NOT NULL DEFAULT 1,
        counter bigint NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS ow_business_fixture.receipts (
        command_id text PRIMARY KEY, activation_id text NOT NULL, outcome text NOT NULL);
      CREATE TABLE IF NOT EXISTS ow_business_fixture.trace (
        seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        activation_id text NOT NULL, event text NOT NULL, detail text, created_at timestamptz NOT NULL DEFAULT clock_timestamp());`);
  }
  async create(id: string, approved = false) {
    await this.pool.query('INSERT INTO ow_business_fixture.activations(id,approved) VALUES ($1,$2)', [id,approved]);
  }
  async approved(id: string) {
    const r = await this.pool.query<ActivationRecord>('SELECT approved FROM ow_business_fixture.activations WHERE id=$1', [id]);
    const row=r.rows[0];assert(row,'Fixture activation missing');return row.approved;
  }
  async approve(id: string) { await this.pool.query('UPDATE ow_business_fixture.activations SET approved=true WHERE id=$1', [id]); }
  async cancel(id: string) { await this.pool.query('UPDATE ow_business_fixture.activations SET canceled=true WHERE id=$1', [id]); }
  async replace(id: string) { await this.pool.query('UPDATE ow_business_fixture.activations SET generation=generation+1 WHERE id=$1', [id]); }
  async activate(id: string, commandId: string, generation?: string) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const state = (await c.query<ActivationRecord>('SELECT * FROM ow_business_fixture.activations WHERE id=$1 FOR UPDATE', [id])).rows[0];
      assert(state,'Fixture activation missing');
      let outcome = 'applied';
      if (generation !== undefined && state.generation !== generation) {outcome = 'stale-generation';}
      else if (state.canceled) {outcome = 'canceled';}
      else if (!state.approved) {outcome = 'approval-pending';}
      else {
        const receipt = await c.query('INSERT INTO ow_business_fixture.receipts(command_id,activation_id,outcome) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING command_id', [commandId,id,'applied']);
        if ((receipt.rowCount ?? 0)>0) {await c.query('UPDATE ow_business_fixture.activations SET counter=counter+1 WHERE id=$1',[id]);}
        else {outcome = 'duplicate-receipt';}
      }
      await c.query('INSERT INTO ow_business_fixture.trace(activation_id,event,detail) VALUES($1,$2,$3)',[id,'activate-attempt',outcome]);
      await c.query('COMMIT');
      return {outcome};
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async mark(id: string, event: string, detail = '') {
    await this.pool.query('INSERT INTO ow_business_fixture.trace(activation_id,event,detail) VALUES($1,$2,$3)',[id,event,detail]);
  }
  async snapshot(id: string) {
    const state = (await this.pool.query<ActivationRecord>('SELECT * FROM ow_business_fixture.activations WHERE id=$1',[id])).rows[0];
    assert(state,'Fixture activation missing');
    const trace = (await this.pool.query<TraceRecord>('SELECT seq::text,event,detail,created_at FROM ow_business_fixture.trace WHERE activation_id=$1 ORDER BY seq',[id])).rows;
    return {state,trace};
  }
  async close() { await this.pool.end(); }
}
