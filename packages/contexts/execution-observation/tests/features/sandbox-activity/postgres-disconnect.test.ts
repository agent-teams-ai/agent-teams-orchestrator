import assert from 'node:assert/strict';
import test from 'node:test';
import {Pool} from 'pg';
import {createSandboxActivityFeature} from '../../../dist/index.js';
import {ownedPostgres} from './pg-fixture.ts';
import {terminateOwnedCheckout} from './terminate-backend.ts';
const make=(pool:Pool,migrationPool:Pool)=>createSandboxActivityFeature({pool,migrationPool,authorization:{async assertAuthorized(){return {epoch:'1',allowInternal:false};}},clock:{now:()=> '1'},cursorKey:new Uint8Array(32).fill(7),readTokenLifetimeMicroseconds:'1000000',maxSourceEvents:10,retainedFeedEvents:3});
await test('Activity transactions and migrations survive termination of their checked-out PostgreSQL backend',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  const binding={run:`${context.projectId}/runs/run`,participant:`${context.projectId}/participants/member`,runtimeSessionRef:'runtime:session'};
  try{
    const feature=make(cluster.runtime,cluster.owner);await feature.migrate();
    await cluster.owner.query('GRANT USAGE ON SCHEMA execution_observation TO test_runtime');await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA execution_observation TO test_runtime');
    await terminateOwnedCheckout(cluster.runtime,cluster.owner,pool=>make(pool,cluster.owner).bindRuntime(context,binding));
    await assert.rejects(()=>feature.api.listActivity(context,{run:binding.run,pageSize:1}),{code:'NOT_FOUND'});
    assert.equal((await cluster.owner.query<{count:string}>('SELECT count(*)::text AS count FROM execution_observation.partitions')).rows[0]?.count,'0');
    await terminateOwnedCheckout(cluster.owner,cluster.owner,migrationPool=>make(cluster.runtime,migrationPool).migrate());
    await feature.bindRuntime(context,binding);assert.equal((await feature.api.listActivity(context,{run:binding.run,pageSize:1})).watermark,'0');
  }finally{await cluster.stop([cluster.owner,cluster.runtime]);}
});

await test('an ended actual PostgreSQL Pool returns typed unavailable for Activity reads, ingress and migration',async()=>{
  const pool=new Pool({max:1});await pool.end();const feature=make(pool,pool);
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  const binding={run:`${context.projectId}/runs/run`,participant:`${context.projectId}/participants/member`,runtimeSessionRef:'runtime:session'};
  await assert.rejects(()=>feature.bindRuntime(context,binding),{name:'SandboxActivityError',code:'UNAVAILABLE',message:'Observation connection is unavailable'});
  await assert.rejects(()=>feature.api.listActivity(context,{run:binding.run,pageSize:1}),{name:'SandboxActivityError',code:'UNAVAILABLE',message:'Observation connection is unavailable'});
  await assert.rejects(()=>feature.migrate(),{name:'SandboxActivityError',code:'UNAVAILABLE',message:'Migration connection is unavailable'});
});
