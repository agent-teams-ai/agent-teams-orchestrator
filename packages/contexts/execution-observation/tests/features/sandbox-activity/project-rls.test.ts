import assert from 'node:assert/strict';
import test from 'node:test';
import {createSandboxActivityFeature} from '../../../dist/index.js';
import {ownedPostgres} from './pg-fixture.ts';

// Shared TEST fixture does not capture the active PostgreSQL scope.
const binding=(projectId:string)=>({run:`${projectId}/runs/run`,participant:`${projectId}/participants/member`,runtimeSessionRef:'TEST:session'});

void test('Activity runtime PostgreSQL RLS isolates Projects within the same tenant, including direct SQL',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();
  const tenantId='TEST_tenant';
  const projectA='tenants/TEST_tenant/projects/TEST_A';
  const projectB='tenants/TEST_tenant/projects/TEST_B';
  const contextA={tenantId,projectId:projectA,principalId:'TEST_runtime'};
  const contextB={tenantId,projectId:projectB,principalId:'TEST_runtime'};
  const feature=createSandboxActivityFeature({
    pool:cluster.runtime,migrationPool:cluster.owner,
    authorization:{async assertAuthorized(){return {epoch:'1',allowInternal:false};}},
    clock:{now:()=> '1770000000123456'},cursorKey:new Uint8Array(32).fill(7),
    readTokenLifetimeMicroseconds:'1000000',maxSourceEvents:5,retainedFeedEvents:3,
  });
  try{
    await feature.migrate();
    // Reproduce an already-initialized database with only the original tenant
    // policy, then re-run the idempotent migration. Existing installations must
    // acquire the restrictive project policy without wiping Activity data.
    await cluster.owner.query('DROP POLICY project_scope ON execution_observation.partitions');
    await cluster.owner.query('DROP POLICY project_scope ON execution_observation.outbox');
    await feature.migrate();
    // A pre-existing same-name policy can be permissive or restrict nothing.
    // Re-migration must replace both weakened definitions, not trust names.
    await cluster.owner.query('DROP POLICY project_scope ON execution_observation.partitions');
    await cluster.owner.query('CREATE POLICY project_scope ON execution_observation.partitions AS RESTRICTIVE USING (true) WITH CHECK (true)');
    await cluster.owner.query('DROP POLICY project_scope ON execution_observation.outbox');
    await cluster.owner.query('CREATE POLICY project_scope ON execution_observation.outbox USING (true) WITH CHECK (true)');
    await feature.migrate();
    const policyRows=await cluster.owner.query<{tablename:string;permissive:string}>(
      "SELECT tablename,permissive FROM pg_policies WHERE schemaname='execution_observation' AND policyname='project_scope' ORDER BY tablename");
    assert.deepEqual(policyRows.rows,[
      {tablename:'outbox',permissive:'RESTRICTIVE'},
      {tablename:'partitions',permissive:'RESTRICTIVE'},
    ],'re-migration restores restrictive project policies for preexisting tables');
    await cluster.owner.query('GRANT USAGE ON SCHEMA execution_observation TO test_runtime');
    await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA execution_observation TO test_runtime');
    for(const context of [contextA,contextB]){
      const owner=binding(context.projectId);
      await feature.bindRuntime(context,owner);
      assert.equal((await feature.append(context,{...owner,sourceEventId:'source-1',sourceSequence:'1',kind:'TEXT_SNAPSHOT',text:'TEST-visible',internal:false,blockId:'block'})).status,'accepted');
    }
    // Both Projects have durable rows. An unscoped SQL query under the runtime
    // role must not leak neighboring Projects even when the tenant is the same.
    assert.equal((await cluster.owner.query<{count:string}>('SELECT count(*)::text AS count FROM execution_observation.partitions')).rows[0]?.count,'2');
    assert.equal((await cluster.owner.query<{count:string}>('SELECT count(*)::text AS count FROM execution_observation.outbox')).rows[0]?.count,'2');
    const checkout=await cluster.runtime.connect();
    try{
      await checkout.query('BEGIN');
      await checkout.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.project_id',$2,true)",[tenantId,projectA]);
      const partitions=await checkout.query<{project_id:string}>('SELECT project_id FROM execution_observation.partitions ORDER BY project_id');
      const outbox=await checkout.query<{project_id:string}>('SELECT project_id FROM execution_observation.outbox ORDER BY project_id');
      assert.deepEqual(partitions.rows.map(row=>row.project_id),[projectA]);
      assert.deepEqual(outbox.rows.map(row=>row.project_id),[projectA]);
      const wrongProjectWrite=await checkout.query('UPDATE execution_observation.partitions SET state=state WHERE project_id=$1',[projectB]);
      assert.equal(wrongProjectWrite.rowCount,0,'same-tenant neighboring Project cannot be updated');
      // Verify both DELETE and UPDATE for both tables: SELECT-only isolation
      // cannot substitute for write custody under the pooled runtime role.
      const wrongOutboxUpdate=await checkout.query('UPDATE execution_observation.outbox SET kind=kind WHERE project_id=$1',[projectB]);
      assert.equal(wrongOutboxUpdate.rowCount,0,'neighboring Project outbox cannot be updated');
      const wrongPartitionDelete=await checkout.query('DELETE FROM execution_observation.partitions WHERE project_id=$1',[projectB]);
      assert.equal(wrongPartitionDelete.rowCount,0,'neighboring Project partition cannot be deleted');
      const wrongOutboxDelete=await checkout.query('DELETE FROM execution_observation.outbox WHERE project_id=$1',[projectB]);
      assert.equal(wrongOutboxDelete.rowCount,0,'neighboring Project outbox cannot be deleted');
      await checkout.query('ROLLBACK');

      await checkout.query('BEGIN');
      await checkout.query("SELECT set_config('app.tenant_id',$1,true)",[tenantId]);
      assert.equal((await checkout.query('SELECT * FROM execution_observation.partitions')).rowCount,0,'missing project scope fails closed');
      assert.equal((await checkout.query('SELECT * FROM execution_observation.outbox')).rowCount,0,'missing project scope fails closed for outbox');
      await checkout.query('ROLLBACK');

      await checkout.query('BEGIN');
      await checkout.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.project_id',$2,true)",[tenantId,projectA]);
      await assert.rejects(
        checkout.query('INSERT INTO execution_observation.outbox (tenant_id,project_id,event_id,run,sequence,kind,recorded_at) VALUES ($1,$2,$3,$4,1,$5,now())',
          [tenantId,projectB,'TEST-cross-project',binding(projectB).run,'SandboxActivityRecorded']),
        {code:'42501'},'restrictive WITH CHECK rejects neighboring Project inserts',
      );
      await checkout.query('ROLLBACK');
    }finally{checkout.release();}
    assert.equal((await feature.api.listActivity(contextA,{run:binding(projectA).run,pageSize:5})).items.length,1);
    assert.equal((await feature.api.listActivity(contextB,{run:binding(projectB).run,pageSize:5})).items.length,1);
  }finally{await cluster.stop([cluster.owner,cluster.runtime]);}
});
