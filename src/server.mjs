import http from 'node:http';
import {read} from './token.mjs';
const records=Object.freeze({
 demo_one:{id:'demo_one',label:'Synthetic Location One',tenantId:'tenant-a',version:1},
 demo_two:{id:'demo_two',label:'Synthetic Location Two',tenantId:'tenant-b',version:1}
});
const secret=process.env.LAB_SECRET;
if(!secret||secret.length<32)throw Error('LAB_SECRET must be at least 32 characters');
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer((req,res)=>{
 if(req.url==='/healthz')return json(res,200,{ok:true,module:'alpha'});
 const match=req.url?.match(/^\/v1\/demo-sites\/(demo_[a-z0-9_]+)$/);
 if(req.method!=='GET'||!match)return json(res,404,{error:'not_found'});
 const user=read(req.headers.authorization,secret);
 if(!user)return json(res,401,{error:'unauthorised'});
 const record=records[match[1]];
 if(!record)return json(res,404,{error:'not_found'});
 if(record.tenantId!==user.tenant)return json(res,403,{error:'forbidden'});
 return json(res,200,record);
});
server.requestTimeout=5000;
server.listen(Number(process.env.PORT||4301), '127.0.0.1');
process.on('SIGTERM',()=>server.close());
