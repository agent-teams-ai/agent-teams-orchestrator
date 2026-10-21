import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import type {ActivityCursorCodec} from './postgres-read-tokens.js';
/** Host-owned stable secret; encrypted authenticated metadata contains no activity payload. */
export function createActivityCursorCodec(secret:Uint8Array):ActivityCursorCodec {
  if(secret.byteLength!==32){throw new TypeError('Activity cursor key must contain 32 bytes');}
  const key=Buffer.from(secret);
  return {
    encode(value){const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,nonce);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([nonce,cipher.getAuthTag(),data]).toString('base64url');},
    decode(value){if(value.length>8192||!/^[A-Za-z0-9_-]+$/u.test(value)){throw new Error('Invalid cursor');}const bytes=Buffer.from(value,'base64url');if(bytes.length<29){throw new Error('Invalid cursor');}const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));const text=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');const decoded:unknown=JSON.parse(text);return decoded;},
  };
}
