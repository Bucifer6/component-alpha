import {createHmac, timingSafeEqual} from 'node:crypto';
export function sign(tenant,secret) {
  const payload=Buffer.from(JSON.stringify({tenant})).toString('base64url');
  const mac=createHmac('sha256',secret).update(payload).digest('base64url');
  return 'Bearer '+payload+'.'+mac;
}
export function read(header,secret) {
  if(!secret || typeof header!=='string' || !header.startsWith('Bearer ')) return null;
  const parts=header.slice(7).split('.');
  if(parts.length!==2)return null;
  const expected=createHmac('sha256',secret).update(parts[0]).digest('base64url');
  const a=Buffer.from(expected),b=Buffer.from(parts[1]);
  if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  try { const value=JSON.parse(Buffer.from(parts[0],'base64url').toString());return typeof value.tenant==='string'?value:null; }catch{return null;}
}
// Synthetic HMAC lab token only; NOT production authentication.
