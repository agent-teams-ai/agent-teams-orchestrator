import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Pool} from 'pg';
export async function ownedPostgres(){
  const root=await mkdtemp(join(process.platform==='darwin'?'/private/tmp':tmpdir(),'TEST-co-pg-'));const data=join(root,'data');const socket=join(root,'socket');await mkdir(socket,{mode:0o700});
  const bin=process.env.TEST_POSTGRES_BIN??'/opt/homebrew/bin';
  const control=(...args:string[])=>execFileSync(join(bin,'pg_ctl'),['-D',data,...args],{encoding:'utf8',timeout:60000,stdio:'pipe'});
  let started=false;
  try{
    execFileSync(join(bin,'initdb'),['-D',data,'-A','trust','-U','TEST_owner','--no-locale','--encoding=UTF8'],{encoding:'utf8',timeout:60000,stdio:'pipe'});
    control('-l',join(root,'postgres.log'),'-o',`-k ${socket} -c listen_addresses='' -c fsync=on`,'-w','start');started=true;
    const owner=new Pool({host:socket,user:'TEST_owner',database:'postgres',max:5});
    await owner.query('CREATE ROLE test_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT');
    const runtime=new Pool({host:socket,user:'test_runtime',database:'postgres',max:5});
    return {root,owner,runtime,async restart(){await runtime.end();await owner.end();control('-l',join(root,'postgres.log'),'-m','fast','-w','restart');return {owner:new Pool({host:socket,user:'TEST_owner',database:'postgres'}),runtime:new Pool({host:socket,user:'test_runtime',database:'postgres'})};},
      async stop(pools:readonly Pool[]){await Promise.all(pools.map(pool=>pool.ended?Promise.resolve():pool.end()));control('-m','fast','-w','stop');started=false;await rm(root,{recursive:true,force:true});}};
  }catch(error){if(started){control('-m','fast','-w','stop');}await rm(root,{recursive:true,force:true});throw error;}
}
