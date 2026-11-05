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
