import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {sign,read} from '../src/token.mjs';
import {readFileSync} from 'node:fs';
const secret=randomBytes(36).toString('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){return new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
test('v1 contract retains fields consumed by other services',()=>{
 const schema=JSON.parse(readFileSync(new URL('../contracts/demo-site-v1.schema.json',import.meta.url)));
 assert.deepEqual(schema.required,['id','displayName','tenantId','version']);
});
test('synthetic token refuses tampering',()=>{
 const token=sign('tenant-a',secret);assert.equal(read(token,secret).tenant,'tenant-a');
 assert.equal(read(token+'x',secret),null);
});
test('isolated HTTP service denies cross-tenant access',async()=>{
 const p=await port();const child=spawn(process.execPath,['src/server.mjs'],{env:{...process.env,PORT:String(p),LAB_SECRET:secret},stdio:'ignore'});
 const base='http://127.0.0.1:'+p+'/v1/demo-sites/demo_one';
 try{
  let started=false;for(let i=0;i<70;i++){try{if((await fetch('http://127.0.0.1:'+p+'/healthz',{signal:AbortSignal.timeout(150)})).ok){started=true;break;}}catch{}await pause(25);}
  assert.equal(started,true,'provider starts');
  assert.equal((await fetch(base)).status,401);
  assert.equal((await fetch(base,{headers:{authorization:sign('tenant-b',secret)}})).status,403);
  const ok=await fetch(base,{headers:{authorization:sign('tenant-a',secret)}});assert.equal(ok.status,200);
  assert.equal((await ok.json()).displayName,'Synthetic Location One');
 }finally{child.kill('SIGTERM');}
});
