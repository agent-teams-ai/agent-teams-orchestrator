import assert from 'node:assert/strict';
import test from 'node:test';
import {createActivityApi} from '../../../dist/features/sandbox-activity/application/create-activity-api.js';
import {createActivityAdmission} from '../../../dist/features/sandbox-activity/application/admit-sandbox-activity.js';
void test('Activity query and ingress retain entry authority and data across pending authorization',async()=>{
  const scope={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  const run=`${scope.projectId}/runs/one`;const evidence={run,participant:`${scope.projectId}/participants/one`,runtimeSessionRef:'runtime:one',sourceEventId:'source:one',sourceSequence:'1',kind:'TEXT_SNAPSHOT' as const,text:'one',internal:false,blockId:'one'};
  for(const action of ['list','feed','bind','append']){
    const context={...scope};const value={...evidence};const input={run,pageSize:1};let observed:unknown;
    const {promise:gate,resolve:release}=Promise.withResolvers<null>();const authorization={async assertAuthorized(){await gate;return {epoch:'1',allowInternal:false};}};
    const api=createActivityApi({authorization,store:{async list(received,request){observed={context:received,input:request};return {items:[],watermark:'0',cursor:'cursor',freshness:'current',gap:false};},async feed(received,request){observed={context:received,input:request};return {events:[],nextCursor:'cursor',gap:false};}}});
    const ingress=createActivityAdmission({authorization,store:{async bind(received,binding){observed={context:received,value:binding};},async append(received,facts){observed={context:received,value:facts};return {status:'accepted',sequence:'1'};}}});
    const operation=action==='list'?api.listActivity(context,input):action==='feed'?api.readFeed(context,input):action==='bind'?ingress.bindRuntime(context,value):ingress.append(context,value);
    context.principalId='TEST_other';context.projectId='tenants/TEST_tenant/projects/other';input.run=`${scope.projectId}/runs/other`;value.text='changed';value.run=input.run;release(null);await operation;
    const expectedValue=action==='bind'?{run,participant:evidence.participant,runtimeSessionRef:evidence.runtimeSessionRef}:evidence;
    assert.deepEqual(observed,action==='list'||action==='feed'?{context:scope,input:{run,pageSize:1}}:{context:scope,value:expectedValue});
  }
});

void test('malformed serialized authority fails closed before authorization and Activity side effects', async () => {
  const scope={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  const binding={run:`${scope.projectId}/runs/one`,participant:`${scope.projectId}/participants/one`,runtimeSessionRef:'runtime:one'};
  const evidence={...binding,sourceEventId:'source:one',sourceSequence:'1',kind:'TEXT_SNAPSHOT' as const,text:'one',internal:false,blockId:'one'};
  let sideEffects=0;
  const authorization={async assertAuthorized(){sideEffects++;return {epoch:'1',allowInternal:false};}};
  const ingress=createActivityAdmission({authorization,store:{
    async bind(){sideEffects++;},
    async append(){sideEffects++;return {status:'accepted' as const,sequence:'1'};}
  }});
  const api=createActivityApi({authorization,store:{
    async list(){sideEffects++;return {items:[],watermark:'0',cursor:'cursor',freshness:'current' as const,gap:false};},
    async feed(){sideEffects++;return {events:[],nextCursor:'cursor',gap:false};}
  }});
  // Each value is legal to deserialize, but not a trusted ActivityRequestContext.
  const malformed: unknown[]=[
    null, {}, { ...scope,tenantId:123 }, { ...scope,projectId:123 },
    { ...scope,principalId:[] }, { ...scope,principalId:null },
    // structuredClone retains enumerable array properties: the original scope
    // fields must not make an array into an admitted authority context.
    Object.assign([],scope),
    Object.defineProperty({...scope},'extra',{
      enumerable:true,get(){throw new Error('TEST authority accessor failure');}
    }),
    {...scope,extra:()=>null},
    (()=>{const revoked=Proxy.revocable({...scope},{});revoked.revoke();return revoked.proxy;})(),
  ];
  for(const value of malformed){
    const context=value as typeof scope;
    await assert.rejects(()=>ingress.bindRuntime(context,binding),{name:'SandboxActivityError',code:'PERMISSION_DENIED'});
    await assert.rejects(()=>ingress.append(context,evidence),{name:'SandboxActivityError',code:'PERMISSION_DENIED'});
    await assert.rejects(()=>api.listActivity(context,{run:binding.run,pageSize:1}),{name:'SandboxActivityError',code:'PERMISSION_DENIED'});
    await assert.rejects(()=>api.readFeed(context,{run:binding.run,pageSize:1}),{name:'SandboxActivityError',code:'PERMISSION_DENIED'});
  }
  assert.equal(sideEffects,0,'malformed authority cannot reach authorization or persistence');
});

void test('malformed serialized Activity payloads fail closed before authorization or persistence',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  let sideEffects=0;
  const authorization={async assertAuthorized(){sideEffects++;return {epoch:'1',allowInternal:false};}};
  const ingress=createActivityAdmission({authorization,store:{
    async bind(){sideEffects++;},
    async append(){sideEffects++;return {status:'accepted' as const,sequence:'1'};}
  }});
  const binding={run:`${context.projectId}/runs/one`,participant:`${context.projectId}/participants/one`,runtimeSessionRef:'runtime:one'};
  const throwingPayload=Object.defineProperty({...binding},'extra',{
    enumerable:true,get(){throw new Error('TEST ingress accessor failure');}
  });
  const revoked=Proxy.revocable({...binding},{});
  revoked.revoke();
  const malformed:unknown[]=[
    null,undefined,[],42,'invalid',true,
    {...binding,extra:()=>null},
    {...binding,extra:Symbol('invalid')},
    throwingPayload,
    revoked.proxy,
  ];
  for(const value of malformed){
    await assert.rejects(()=>ingress.bindRuntime(context,value as Parameters<typeof ingress.bindRuntime>[1]),
      {name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
    await assert.rejects(()=>ingress.append(context,value as Parameters<typeof ingress.append>[1]),
      {name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
  }
  assert.equal(sideEffects,0,'invalid serialized Activity cannot reach authorization or persistence');
});

void test('Activity evidence rejects malformed UTF-16 and C1 controls while preserving astral text',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  const binding={run:`${context.projectId}/runs/one`,participant:`${context.projectId}/participants/one`,runtimeSessionRef:'runtime:one'};
  const evidence={...binding,sourceEventId:'source:one',sourceSequence:'1',kind:'TEXT_SNAPSHOT' as const,
    text:'valid',internal:false,blockId:'one'};
  let authorizationCalls=0;let storeCalls=0;const saved:string[]=[];
  const ingress=createActivityAdmission({
    authorization:{async assertAuthorized(){authorizationCalls++;return {epoch:'1',allowInternal:false};}},
    store:{async bind(){storeCalls++;},async append(_context,received){storeCalls++;saved.push(received.text);
      return {status:'accepted' as const,sequence:'1'};}}
  });
  for(const text of ['\uD800','\uDC00','prefix\uD800suffix','prefix\uDC00suffix','\u007F','\u0080','\u0085','\u009F','prefix\u009B[31m']) {
    await assert.rejects(()=>ingress.append(context,{...evidence,text}),
      {name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
  }
  assert.equal(authorizationCalls,0,'unsafe Unicode evidence must not authorize');
  assert.equal(storeCalls,0,'unsafe Unicode evidence must not persist controls or replacement characters');
  const validAstral='prefix\u00A0\uD83D\uDE00suffix';
  await ingress.append(context,{...evidence,text:validAstral});
  assert.equal(authorizationCalls,1);
  assert.equal(storeCalls,1);
  assert.deepEqual(saved,[validAstral],'valid surrogate pairs retain their original text');
});

void test('malformed serialized Activity read requests reject before authorization or persistence',async()=>{
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  let effects=0;
  const authorization={async assertAuthorized(){effects++;return {epoch:'1',allowInternal:false};}};
  const api=createActivityApi({authorization,store:{
    async list(){effects++;return {items:[],watermark:'0',cursor:'cursor',freshness:'current' as const,gap:false};},
    async feed(){effects++;return {events:[],nextCursor:'cursor',gap:false};}
  }});
  // Direct callers can supply uncloneable top-level or nested values.
  // Both reject as INVALID_ARGUMENT before authorization or persistence.
  const run=`${context.projectId}/runs/one`;
  const throwingReadInput=Object.defineProperty({run,pageSize:1},'extra',{
    enumerable:true,get(){throw new Error('TEST input accessor failure');}
  });
  const revokedRequest=Proxy.revocable({run,pageSize:1},{});
  revokedRequest.revoke();
  const malformed:unknown[]=[
    null,undefined,[],42,'invalid',true,Symbol('invalid'),()=>null,
    revokedRequest.proxy,
    {run,pageSize:1,extra:()=>null},
    {run,pageSize:1,extra:Symbol('invalid')},
    throwingReadInput,
  ];
  for(const value of malformed){
    const input=value as Parameters<typeof api.listActivity>[1];
    await assert.rejects(()=>api.listActivity(context,input),{name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
    await assert.rejects(()=>api.readFeed(context,input),{name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
  }
  const throwingContext=Object.defineProperty({...context},'extra',{
    enumerable:true,get(){throw new Error('TEST context accessor failure');}
  });
  for (const uncloneableContext of [
    {...context,extra:()=>null},
    {...context,extra:Symbol('uncloneable')},
    throwingContext,
  ]) {
    await assert.rejects(() => api.listActivity(uncloneableContext,{run,pageSize:1}),
      {name:'SandboxActivityError',code:'PERMISSION_DENIED'});
    await assert.rejects(() => api.readFeed(uncloneableContext,{run,pageSize:1}),
      {name:'SandboxActivityError',code:'PERMISSION_DENIED'});
  }
  assert.equal(effects,0,'malformed read payload cannot authorize or touch storage');
});

void test('malformed Activity read cursors fail closed before authorization or SQL', async () => {
  const context={tenantId:'TEST_tenant',projectId:'tenants/TEST_tenant/projects/TEST_project',principalId:'TEST_subject'};
  const run=`${context.projectId}/runs/one`;
  let authorizations=0;let databaseReads=0;
  const api=createActivityApi({
    authorization:{async assertAuthorized(){authorizations++;return {epoch:'1',allowInternal:false};}},
    store:{
      async list(){databaseReads++;return {items:[],watermark:'0',cursor:'cursor',freshness:'current' as const,gap:false};},
      async feed(){databaseReads++;return {events:[],nextCursor:'cursor',gap:false};}
    }
  });
  // These are serializable but not valid opaque cursor arguments. The prior
  // implementation only checked their shape after authorization and SQL.
  const oversizedMultibyte='\u00E9'.repeat(4097);
  assert.ok(oversizedMultibyte.length < 8192 && Buffer.byteLength(oversizedMultibyte,'utf8') > 8192,
    'multibyte token exceeds the codec byte bound but not the UTF-16 length bound');
  const invalid:unknown[]=[
    null,0,42,true,{},[],['token'],'', 'x'.repeat(8193),oversizedMultibyte,
    'abc+def','abc/def','abc=','abc def','abc\ndef','abc%20','abc\u00A0def','abc\uD800def',
  ];
  for(const cursor of invalid){
    await assert.rejects(()=>api.listActivity(context,{run,pageSize:1,pageToken:cursor} as Parameters<typeof api.listActivity>[1]),
      {name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
    await assert.rejects(()=>api.readFeed(context,{run,pageSize:1,cursor} as Parameters<typeof api.readFeed>[1]),
      {name:'SandboxActivityError',code:'INVALID_ARGUMENT'});
  }
  assert.equal(authorizations,0,'invalid cursor cannot reach authorization');
  assert.equal(databaseReads,0,'invalid cursor cannot open a database read');
  await api.listActivity(context,{run,pageSize:1});
  await api.readFeed(context,{run,pageSize:1});
  assert.equal(authorizations,2,'cursor omission still permits normal authorization');
  assert.equal(databaseReads,2,'cursor omission still permits both read operations');
});
