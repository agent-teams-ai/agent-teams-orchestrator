import assert from 'node:assert/strict';
import test from 'node:test';
import {createSandboxActivityFeature} from '../../../dist/index.js';
import type {ActivityEvidence} from '../../../dist/index.js';
import {ownedPostgres} from './pg-fixture.ts';
const enabled=process.env.RUN_CONTEXT_OBSERVATION_PG==='1';
void test('authorized Activity transactions retain block identity, dedupe, snapshot/feed gaps and PostgreSQL restart',{skip:!enabled,timeout:90000},async()=>{
  const cluster=await ownedPostgres();let pools={owner:cluster.owner,runtime:cluster.runtime};let now='1770000000123456';let denied=false;let epoch='1';let internal=true;
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_human'};
  const run=`${context.projectId}/runs/run`;const binding={run,participant:`${context.projectId}/participants/member`,runtimeSessionRef:'runtime:session-1'};
  const authorization={async assertAuthorized(){if(denied){throw new Error('TEST revoked');}return {epoch,allowInternal:internal};}};
  const make=(pool=pools.runtime)=>createSandboxActivityFeature({pool,migrationPool:pools.owner,authorization,clock:{now:()=>now},cursorKey:new Uint8Array(32).fill(7),readTokenLifetimeMicroseconds:'1000000',maxSourceEvents:30,retainedFeedEvents:3});
  let feature=make();
  const evidence=(sequence:string,text:string,extra:Partial<ActivityEvidence>={}):ActivityEvidence=>({...binding,sourceEventId:`source-${sequence}`,sourceSequence:sequence,kind:'TEXT_SNAPSHOT',text,internal:false,blockId:'message-1-block-0',runtimeOperationRef:'operation:one',...extra});
  try{
    await feature.migrate();await pools.owner.query('GRANT USAGE ON SCHEMA execution_observation TO test_runtime');await pools.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA execution_observation TO test_runtime');await feature.bindRuntime(context,binding);
    const invalid=evidence('1','bad exact');assert.equal(Reflect.set(invalid,'sourceSequence',1),true);
    await assert.rejects(()=>feature.append(context,invalid),{code:'INVALID_ARGUMENT'});
    const initial=await feature.api.listActivity(context,{run,pageSize:2});assert.equal(initial.watermark,'0');
    const concurrent=await Promise.all([feature.append(context,evidence('1','one')),feature.append(context,evidence('1','one'))]);assert.deepEqual(concurrent.map(item=>item.status).toSorted(),['accepted','duplicate']);
    assert.equal((await feature.append(context,evidence('1','one'))).status,'duplicate');
    await assert.rejects(()=>feature.append(context,evidence('1','changed')),{code:'CONFLICT'});
    await feature.append(context,evidence('2','one two'));
    await feature.append(context,evidence('3',' three',{kind:'TEXT_DELTA'}));
    const accumulated=await feature.api.listActivity(context,{run,pageSize:10});assert.equal(accumulated.items[0]?.kind,'TEXT_SNAPSHOT');assert.equal(accumulated.items[0].text,'one two three');
    await feature.append(context,evidence('4','one two three',{kind:'TEXT_COMPLETE'}));
    let snapshot=await feature.api.listActivity(context,{run,pageSize:2});assert.equal(snapshot.items.length,1);assert.equal(snapshot.items[0]?.text,'one two three');assert.equal(snapshot.items[0].recordedAt,now);
    const lost=await feature.api.readFeed(context,{run,cursor:initial.cursor,pageSize:2});assert.equal(lost.gap,true);assert.equal(lost.events.length,0);
    await feature.append(context,evidence('5','same text',{blockId:'message-2-block-0',runtimeOperationRef:'operation:two'}));
    await feature.append(context,evidence('6','same text',{blockId:'message-3-block-0',runtimeOperationRef:'operation:three'}));
    snapshot=await feature.api.listActivity(context,{run,pageSize:1});assert(snapshot.nextPageToken!==undefined&&snapshot.nextPageToken!=='');const pinned=snapshot;const pageToken=pinned.nextPageToken;assert(pageToken!==undefined&&pageToken!=='');
    await feature.append(context,evidence('7','updated third',{blockId:'message-3-block-0',runtimeOperationRef:'operation:three'}));
    const page=await feature.api.listActivity(context,{run,pageSize:2,pageToken});assert.deepEqual(page.items.map(item=>item.text),['same text','same text']);assert.equal(page.watermark,pinned.watermark);
    const delta=await feature.api.readFeed(context,{run,cursor:pinned.cursor,pageSize:10});assert.equal(delta.events.length,1);assert.equal(delta.events[0]?.sequence,'7');
    await assert.rejects(()=>feature.append(context,evidence('8',String.fromCharCode(27)+'[31m')),{code:'INVALID_ARGUMENT'});
    await assert.rejects(()=>feature.append(context,evidence('8','foreign',{runtimeSessionRef:'runtime:other'})),{code:'PERMISSION_DENIED'});
    await assert.rejects(()=>feature.append(context,evidence('8','foreign task',{task:`${context.projectId}/tasks/foreign`})),{code:'PERMISSION_DENIED'});
    await assert.rejects(()=>feature.append(context,evidence('8','late reopening')),{code:'STALE'});
    await assert.rejects(()=>feature.api.readFeed(context,{run:`${context.projectId}/runs/foreign`,cursor:pinned.cursor,pageSize:10}),{code:'NOT_FOUND'});
    denied=true;await assert.rejects(()=>feature.append(context,evidence('1','one')),/TEST revoked/);await assert.rejects(()=>feature.api.readFeed(context,{run,cursor:pinned.cursor,pageSize:10}),/TEST revoked/);denied=false;
    epoch='2';assert.equal((await feature.api.readFeed(context,{run,cursor:pinned.cursor,pageSize:10})).gap,true);
    const sourceGapCursor=(await feature.api.listActivity(context,{run,pageSize:10})).cursor;
    await feature.append(context,evidence('9','source gap',{blockId:'message-4-block-0'}));snapshot=await feature.api.listActivity(context,{run,pageSize:10});assert.equal(snapshot.gap,true);assert.equal(snapshot.freshness,'incomplete');
    assert.equal((await feature.api.readFeed(context,{run,cursor:sourceGapCursor,pageSize:10})).gap,true);
    assert.equal((await feature.api.readFeed(context,{run,cursor:snapshot.cursor,pageSize:10})).gap,false,'fresh incomplete snapshot resumes without an infinite gap loop');
    await feature.append(context,evidence('10','hidden',{blockId:'internal-block',internal:true}));internal=false;assert.equal((await feature.api.listActivity(context,{run,pageSize:10})).items.some(item=>item.internal),false);
    const savedState=(await pools.owner.query<{state:unknown}>('SELECT state FROM execution_observation.partitions WHERE run=$1',[run])).rows[0]?.state;assert.notEqual(savedState,undefined);
    await pools.owner.query("UPDATE execution_observation.partitions SET state=jsonb_set(state,'{history,0,run}',to_jsonb($1::text)) WHERE run=$2",[`${context.projectId}/runs/foreign`,run]);
    await assert.rejects(()=>feature.api.listActivity(context,{run,pageSize:10}),{code:'UNAVAILABLE'});
    await pools.owner.query('UPDATE execution_observation.partitions SET state=$1::jsonb WHERE run=$2',[JSON.stringify(savedState),run]);
    await pools.owner.query("UPDATE execution_observation.partitions SET state=jsonb_set(state,'{receipts,0,sequence}',to_jsonb('0'::text)) WHERE run=$1",[run]);
    await assert.rejects(()=>feature.append(context,evidence('1','one')),{code:'UNAVAILABLE'});
    await pools.owner.query('UPDATE execution_observation.partitions SET state=$1::jsonb WHERE run=$2',[JSON.stringify(savedState),run]);
    const beforeRestart=await feature.api.listActivity(context,{run,pageSize:10});pools=await cluster.restart();feature=make();assert.deepEqual((await feature.api.listActivity(context,{run,pageSize:10})).items,beforeRestart.items);
    assert.equal((await feature.append(context,evidence('1','one'))).status,'duplicate');assert.equal((await pools.owner.query<{count:string}>('SELECT count(*)::text AS count FROM execution_observation.outbox')).rows[0]?.count,'9');
    const client=await pools.runtime.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.tenant_id','foreign',true)");assert.equal((await client.query('SELECT * FROM execution_observation.partitions')).rowCount,0);await client.query('ROLLBACK');}finally{client.release();}
    now=(BigInt(now)+1000001n).toString();assert.equal((await feature.api.readFeed(context,{run,cursor:beforeRestart.cursor,pageSize:10})).gap,true);
    let loseCommit=true;
    const lostResponsePool=new Proxy(pools.runtime,{get(target,key){
      if(key!=='connect'){const value:unknown=Reflect.get(target,key);return value;}
      return async()=>{const borrowed=await target.connect();return new Proxy(borrowed,{get(connection,property){
        if(property==='release'){return connection.release.bind(connection);}
        if(property!=='query'){const value:unknown=Reflect.get(connection,property);return value;}
        return async(text:string,values?:unknown[])=>{const result=await connection.query(text,values);if(text==='COMMIT'&&loseCommit){loseCommit=false;throw new Error('TEST committed response lost');}return result;};
      }});};
    }});
    const loss=make(lostResponsePool);const committed=evidence('11','committed response lost',{blockId:'lost-response'});
    await assert.rejects(()=>loss.append(context,committed),{code:'UNAVAILABLE'});
    assert.equal((await feature.append(context,committed)).status,'duplicate');
    assert.equal((await pools.owner.query<{count:string}>('SELECT count(*)::text AS count FROM execution_observation.outbox')).rows[0]?.count,'10');
    await pools.owner.query("CREATE FUNCTION execution_observation.test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST rollback'; END $$");await pools.owner.query('CREATE TRIGGER test_rollback BEFORE INSERT ON execution_observation.outbox FOR EACH ROW EXECUTE FUNCTION execution_observation.test_reject()');
    await assert.rejects(()=>feature.append(context,evidence('12','must rollback',{blockId:'failure'})),{code:'UNAVAILABLE'});assert.equal((await feature.api.listActivity(context,{run,pageSize:10})).watermark,'10');
  }finally{await cluster.stop([pools.owner,pools.runtime]);}
});
