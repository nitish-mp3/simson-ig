import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MinimalSIPUA } from '../src/transport/sip-ua.js';

test('SIP body lengths count UTF-8 bytes, not JavaScript characters',()=>{
  const client=new MinimalSIPUA({uri:'sip:test@example.invalid'});
  const body='s=Entrée\r\n';
  const expected=new TextEncoder().encode(body).length;
  assert.match(client._buildRequest('INVITE','sip:room@example.invalid','test',1,'',body),new RegExp('Content-Length: '+expected+'\r\n'));
  assert.match(client._buildResponse(200,'OK','from','to','test','via','1 INVITE',body),new RegExp('Content-Length: '+expected+'\r\n'));
});

test('digest authentication never prints password-derived hashes or challenge material',()=>{
  const client=new MinimalSIPUA({uri:'sip:test@example.invalid',password:'fixture-password'});
  const original=console.log;
  const printed=[];
  let sent;
  console.log=(...values)=>printed.push(values.join(' '));
  client._send=value=>{sent=value;};
  try {
    client._handleDigestChallenge(401,'WWW-Authenticate: Digest realm="test",nonce="fixture-nonce",qop="auth"\r\n','REGISTER','sip:example.invalid','test');
  } finally {console.log=original;}
  assert.match(sent,/Authorization: Digest/);
  assert.deepEqual(printed,[]);
});
