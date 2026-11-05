import assert from 'node:assert/strict';
import test from 'node:test';
import {Client,Pool} from 'pg';
import {ActivityAdmissionError} from '../../../dist/features/sandbox-activity/domain/activity-admission.js';
import {activityTransaction} from '../../../dist/features/sandbox-activity/adapters/outbound/persistence/postgres-transaction.js';
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

await test('release-time PostgreSQL checkout faults cannot confirm Activity reads or writes',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  for(const readOnly of [false,true] as const){
    for(const mode of ['socket-error','release-throws'] as const){
      const pool=new Pool();const client=new Client();const queries:string[]=[];let releases=0;
      Object.defineProperty(pool,'connect',{value:async()=>client});
      Object.defineProperty(client,'query',{value:async(sql:string)=>{queries.push(sql);return {rows:[]};}});
      Object.defineProperty(client,'release',{value:()=>{
        releases++;
        if(mode==='socket-error'){client.emit('error',new Error('TEST socket fault at release'));}
        else {throw new Error('TEST release transfer failed');}
      }});
      try {
        await assert.rejects(()=>activityTransaction(pool,context,async()=> 'TEST committed result',readOnly),{code:'UNAVAILABLE'});
        assert.equal(releases,1);
        assert.equal(queries.filter(query=>query==='COMMIT').length,1);
        assert.equal(queries.filter(query=>query==='ROLLBACK').length,0);
        assert.equal(client.listenerCount('error'),mode==='release-throws'?1:0,'keep the checkout listener if custody transfer failed');
      } finally {await pool.end();}
    }
  }
});

await test('pre-COMMIT Activity conflict survives a throwing PostgreSQL release',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  const pool=new Pool();const client=new Client();const queries:string[]=[];let releases=0;
  Object.defineProperty(pool,'connect',{value:async()=>client});
  Object.defineProperty(client,'query',{value:async(sql:string)=>{queries.push(sql);return {rows:[]};}});
  Object.defineProperty(client,'release',{value:()=>{releases++;throw new Error('TEST release failed');}});
  try {
    await assert.rejects(()=>activityTransaction(pool,context,async()=>{
      throw new ActivityAdmissionError('CONFLICT','TEST source identity conflict');
    }),{code:'CONFLICT',message:'TEST source identity conflict'});
    assert.equal(releases,1);
    assert.equal(queries.filter(query=>query==='COMMIT').length,0);
    assert.equal(queries.filter(query=>query==='ROLLBACK').length,1);
    assert.equal(client.listenerCount('error'),1);
  } finally {await pool.end();}
});
