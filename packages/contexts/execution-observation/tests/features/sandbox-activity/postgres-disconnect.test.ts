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

await test('real PostgreSQL keeps the committed Activity binding when release confirmation is lost',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  const binding={run:`${context.projectId}/runs/lost-release`,participant:`${context.projectId}/participants/member`,runtimeSessionRef:'runtime:lost-release'};
  const feature=make(cluster.runtime,cluster.owner);
  const connect=cluster.runtime.connect.bind(cluster.runtime);
  let releases=0;
  try{
    await feature.migrate();
    await cluster.owner.query('GRANT USAGE ON SCHEMA execution_observation TO test_runtime');
    await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA execution_observation TO test_runtime');
    Object.defineProperty(cluster.runtime,'connect',{configurable:true,value:async()=>{
      const client=await connect();
      const release=client.release.bind(client);
      Object.defineProperty(client,'release',{value:()=>{
        releases++;
        release(true);
        throw new Error('TEST release acknowledgement lost after COMMIT');
      }});
      return client;
    }});
    await assert.rejects(()=>feature.bindRuntime(context,binding),{name:'SandboxActivityError',code:'UNAVAILABLE'});
    assert.equal(releases,1,'the uncertain write must not be attempted again');
    const persisted=await cluster.owner.query<{count:string;session:string}>(
      "SELECT count(*)::text AS count,max(state->'binding'->>'runtimeSessionRef') AS session FROM execution_observation.partitions WHERE run=$1",
      [binding.run]
    );
    assert.equal(persisted.rows[0]?.count,'1','the original write physically committed');
    assert.equal(persisted.rows[0]?.session,binding.runtimeSessionRef);
  }finally{
    Object.defineProperty(cluster.runtime,'connect',{configurable:true,value:connect});
    await cluster.stop([cluster.owner,cluster.runtime]);
  }
});

await test('real PostgreSQL retains committed schema after migration release acknowledgement is lost',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();
  const connect=cluster.owner.connect.bind(cluster.owner);
  let releases=0;
  try{
    Object.defineProperty(cluster.owner,'connect',{configurable:true,value:async()=>{
      const client=await connect();
      const release=client.release.bind(client);
      Object.defineProperty(client,'release',{value:()=>{
        releases++;
        release(true);
        throw new Error('TEST migration release acknowledgement lost after COMMIT');
      }});
      return client;
    }});
    await assert.rejects(()=>make(cluster.runtime,cluster.owner).migrate(),{name:'SandboxActivityError',code:'UNAVAILABLE'});
    assert.equal(releases,1,'migration must not be automatically replayed after an uncertain outcome');
    // Read back through the unmodified pool: the fault must affect only the original checkout.
    Object.defineProperty(cluster.owner,'connect',{configurable:true,value:connect});
    const committed=await cluster.owner.query<{name:string;rls:boolean;forced:boolean;policy:string}>(
      `SELECT c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced,
         coalesce(p.policyname,'') AS policy
         FROM pg_class c
         JOIN pg_namespace n ON n.oid=c.relnamespace
         LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
         WHERE n.nspname='execution_observation' AND c.relname IN ('partitions','outbox')
         ORDER BY c.relname,p.policyname`
    );
    assert.deepEqual(committed.rows.map(row=>[row.name,row.rls,row.forced,row.policy]),[
      ['outbox',true,true,'project_scope'],
      ['outbox',true,true,'tenant_guard'],
      ['outbox',true,true,'tenant_scope'],
      ['partitions',true,true,'project_scope'],
      ['partitions',true,true,'tenant_guard'],
      ['partitions',true,true,'tenant_scope'],
    ],'migration physically committed both tables and all three RLS policies');
  }finally{
    Object.defineProperty(cluster.owner,'connect',{configurable:true,value:connect});
    await cluster.stop([cluster.owner,cluster.runtime]);
  }
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

await test('pre-COMMIT Activity conflict is definite only after healthy PostgreSQL release',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  for(const releaseFault of [false,true] as const){
    const pool=new Pool();const client=new Client();const queries:string[]=[];let releases=0;
    Object.defineProperty(pool,'connect',{value:async()=>client});
    Object.defineProperty(client,'query',{value:async(sql:string)=>{queries.push(sql);return {rows:[]};}});
    Object.defineProperty(client,'release',{value:()=>{releases++;if(releaseFault){throw new Error('TEST release failed');}}});
    try {
      await assert.rejects(()=>activityTransaction(pool,context,async()=>{
        throw new ActivityAdmissionError('CONFLICT','TEST source identity conflict');
      }),releaseFault
        ? {code:'UNAVAILABLE',message:'Observation release requires same-source reconciliation'}
        : {code:'CONFLICT',message:'TEST source identity conflict'});
      assert.equal(releases,1);
      assert.equal(queries.filter(query=>query==='COMMIT').length,0);
      assert.equal(queries.filter(query=>query==='ROLLBACK').length,1);
      assert.equal(client.listenerCount('error'),releaseFault?1:0);
    } finally {await pool.end();}
  }
});

await test('migration release-time PostgreSQL faults cannot confirm schema custody',async()=>{
  for(const mode of ['socket-error','release-throws'] as const){
    const pool=new Pool();const client=new Client();const queries:string[]=[];let releases=0;
    Object.defineProperty(pool,'connect',{value:async()=>client});
    Object.defineProperty(client,'query',{value:async(sql:string)=>{queries.push(sql);return {rows:[]};}});
    Object.defineProperty(client,'release',{value:()=>{
      releases++;
      if(mode==='socket-error'){client.emit('error',new Error('TEST migration socket fault'));}
      else {throw new Error('TEST migration release failed');}
    }});
    try{
      await assert.rejects(()=>make(pool,pool).migrate(),{code:'UNAVAILABLE'});
      assert.equal(releases,1);
      assert.equal(queries.filter(query=>query==='COMMIT').length,1);
      assert.equal(queries.filter(query=>query==='ROLLBACK').length,0);
      assert.equal(client.listenerCount('error'),mode==='release-throws'?1:0);
    }finally{await pool.end();}
  }
});

await test('migration release-time connection loss after COMMIT requires reconciliation',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();let signalled=false;
  try{
    const faultPool=new Proxy(cluster.owner,{get(target,key){
      if(key!=='connect'){return Reflect.get(target,key);}
      return async()=>{
        const borrowed=await target.connect();
        let handler:((error:Error)=>void)|undefined;
        return new Proxy(borrowed,{get(connection,property){
          if(property==='on'){return (event:'error',callback:(error:Error)=>void)=>{
            handler=callback;
            return connection.on(event,callback);
          };}
          if(property==='removeListener'){return (event:'error',callback:(error:Error)=>void)=>{
            if(handler===callback){handler=undefined;}
            return connection.removeListener(event,callback);
          };}
          if(property==='release'){return (broken?:boolean)=>{
            if(handler&&!signalled){signalled=true;handler(new Error('TEST migration release socket loss'));}
            connection.release(broken||signalled);
          };}
          return Reflect.get(connection,property);
        }});
      };
    }});
    await assert.rejects(()=>make(cluster.runtime,faultPool).migrate(),
      {name:'SandboxActivityError',code:'UNAVAILABLE',message:'Migration release requires same-identity reconciliation'});
    assert.equal(signalled,true,'migration must observe connection errors through release');
    // The DDL may have committed. Reconcile by reading the same migration identity,
    // never by guessing that the failed release rolled the transaction back.
    await make(cluster.runtime,cluster.owner).migrate();
  }finally{await cluster.stop([cluster.owner,cluster.runtime]);}
});

await test('Activity read release-time loss supersedes an earlier typed NOT_FOUND',{skip:process.env.RUN_CONTEXT_OBSERVATION_PG!=='1',timeout:90000},async()=>{
  const cluster=await ownedPostgres();
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  let releaseFault=false;
  try{
    await make(cluster.runtime,cluster.owner).migrate();
    await cluster.owner.query('GRANT USAGE ON SCHEMA execution_observation TO test_runtime');
    await cluster.owner.query('GRANT SELECT ON ALL TABLES IN SCHEMA execution_observation TO test_runtime');
    const uncertainPool=new Proxy(cluster.runtime,{get(target,key){
      if(key!=='connect'){return Reflect.get(target,key);}
      return async()=>{
        const borrowed=await target.connect();
        return new Proxy(borrowed,{get(connection,property){
          if(property==='release'){return (broken?:boolean)=>{
            connection.release(broken);
            releaseFault=true;
            throw new Error('TEST lost release ACK after NOT_FOUND');
          };}
          return Reflect.get(connection,property);
        }});
      };
    }});
    await assert.rejects(()=>make(uncertainPool,cluster.owner).api.listActivity(context,{run:`${context.projectId}/runs/missing`,pageSize:1}),
      {name:'SandboxActivityError',code:'UNAVAILABLE',message:'Observation release requires same-source reconciliation'});
    assert.equal(releaseFault,true,'native PostgreSQL checkout must reach the release fault');
  }finally{await cluster.stop([cluster.owner,cluster.runtime]);}
});
