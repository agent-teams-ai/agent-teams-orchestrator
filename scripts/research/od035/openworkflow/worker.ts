import assert from 'node:assert/strict';
import { OpenWorkflow } from 'openworkflow';
import { BackendPostgres } from 'openworkflow/postgres';
import postgres from 'postgres';
import { BusinessPostgres } from './business-postgres.ts';

const delay = (ms: number) => new Promise(resolve => {setTimeout(resolve,ms);});
const marker = (event: string, id: string, detail = '') => {console.log(JSON.stringify({event,id,detail,at:new Date().toISOString(),pid:process.pid}));};
async function main() {
  const url = process.env.SPIKE_DATABASE_URL;
  const namespaceId = process.env.SPIKE_NAMESPACE;
  assert(url !== undefined && namespaceId !== undefined,'Fixture database URL and namespace are required');
  const flavor = process.env.SPIKE_FLAVOR ?? 'base';
  const pool = postgres(url, {max:3, onnotice:()=>{},transform:{column:{from:postgres.toCamel}}});
  const backend = BackendPostgres.fromPool(pool,{schema:'ow_engine_fixture', namespaceId});
  const business = new BusinessPostgres(url);
  const ow = new OpenWorkflow({backend, logger: {debug(){},info(){},warn(){},error(message,...errors){ marker('engine-error','',message+' '+errors.map(String).join(' ')); }}});
  ow.implementWorkflow<{id:string},unknown>({name:'raw',version:'1'},async({input,step})=>{
    const signal = await step.waitForSignal({name:'approval-wait',signal:input.id,timeout:350});
    return {received:signal!==null};
  });
  ow.implementWorkflow<{id:string;race?:boolean},unknown>({name:'approval',version:'1'},async({input,step})=>{
    for(let round=0;;round++) {
      const approved = await step.run({name:`read-${round}`},()=>business.approved(input.id));
      if(approved) {return step.run({name:'activate'},()=>business.activate(input.id,`${input.id}:activate`));}
      if(input.race===true && round===0) {await step.run({name:'race-window'},async()=>{marker('before-wait',input.id);await delay(700);});}
      await step.waitForSignal({name:`wake-${round}`,signal:input.id,timeout:250});
    }
  });
  ow.implementWorkflow<{id:string},unknown>({name:'gap',version:'1'},async({input,step})=>{
    return step.run({name:'activate'},async()=>{
      const outcome=await business.activate(input.id,`${input.id}:activate`);
      if(flavor==='crash') {marker('after-commit-before-checkpoint',input.id);await new Promise(()=>{});}
      return outcome;
    });
  });
  ow.implementWorkflow<{id:string},unknown>({name:'timer',version:'1'},async({input,step})=>{
    await step.run({name:'before'},()=>business.mark(input.id,'before-timer'));
    await step.sleep('durable-timer','1.2s');
    return step.run({name:'activate'},()=>business.activate(input.id,`${input.id}:activate`));
  });
  for(const version of flavor==='v2-only'?['2']:['1','2']) {
    ow.implementWorkflow<{id:string},unknown>({name:'upgrade',version},async({input,step})=>{
      if(flavor==='compatible') {await step.run({name:'new-before-prepared'},()=>business.mark(input.id,'new-compatible-step'));}
      const prepareName=flavor==='unsafe-change'?'prepared-renamed':'prepared';
      await step.run({name:prepareName},()=>business.mark(input.id,'prepared',version));
      await step.waitForSignal({name:'approval-wait',signal:input.id,timeout:3000});
      await step.run({name:'record-route'},()=>business.mark(input.id,'version-route',version));
      return step.run({name:'activate'},()=>business.activate(input.id,`${input.id}:activate`));
    });
  }
  ow.implementWorkflow<{id:string},unknown>({name:'cancel',version:'1'},async({input,step})=>{
    await step.waitForSignal({name:'approval-wait',signal:input.id,timeout:60000});
    return step.run({name:'activate'},()=>business.activate(input.id,`${input.id}:activate`));
  });
  ow.implementWorkflow<{id:string},unknown>({name:'cancel-active',version:'1'},async({input,step})=>{
    await step.run({name:'active-effect'},async()=>{
      marker('active-callback',input.id); await delay(1500);
      return business.activate(input.id,`${input.id}:activate`);
    });
  });
  ow.implementWorkflow<{id:string},unknown>({name:'stale',version:'1'},async({input,step})=>{
    await step.run({name:'effect'},async()=>{
      if(flavor==='predecessor') {marker('pause-before-effect',input.id); await delay(1800);}
      const outcome = await business.activate(input.id,`${input.id}:activate`,flavor==='predecessor'?'1':'2');
      marker('business-callback-finished',input.id,outcome.outcome);return outcome;
    });
    await step.run({name:'after-effect'},()=>business.mark(input.id,'after-effect'));
    return 'done';
  });
  ow.implementWorkflow<{id:string},unknown>({name:'limit',version:'1'},async({step})=>{
    for(let i=0;i<1001;i++) {await step.run({name:`step-${i}`},()=>i);}
    return 'unreachable';
  });
  ow.implementWorkflow<{id:string},unknown>({name:'reconcile'},async({input,step})=>step.run({name:'reconcile'},()=>business.activate(input.id,`${input.id}:activate`)));
  ow.implementWorkflow<{id:string},unknown>({name:'schedule-version',version:'1'},async({input,step})=>step.run({name:'control'},()=>business.mark(input.id,'schedule-version-1')));
  ow.implementWorkflow<{id:string},unknown>({name:'busy',version:'1'},async({input,step})=>step.run({name:'ordinary'},async()=>{await delay(100);await business.mark(input.id,'ordinary-finished');}));
  ow.implementWorkflow<{id:string},unknown>({name:'wake-control',version:'1'},async({input,step})=>{await step.waitForSignal({name:'wake',signal:input.id,timeout:60000});return step.run({name:'control'},()=>business.mark(input.id,'control-progress'));});
  ow.implementWorkflow<{id:string},unknown>({name:'control',version:'1'},async({input,step})=>step.run({name:'control'},()=>business.mark(input.id,'control-progress')));
  const worker = ow.newWorker({concurrency:Number(process.env.SPIKE_CONCURRENCY??3),leaseDurationMs:800});
  await worker.start();marker('worker-ready','',flavor);
  const shutdown=async()=>{await worker.stop();await business.close();await pool.end();process.exit(0);};
  process.on('SIGTERM',()=>{shutdown().catch((error:unknown)=>{console.error(error);process.exitCode=1;});});
}
main().catch((e:unknown)=>{console.error(e);process.exit(1);});
