import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const key=process.env.SIMSON_SSH_KEY;
if(!key)throw Error('Set SIMSON_SSH_KEY for this explicit isolated-server probe');
const args=['-i',key,'-o','BatchMode=yes','-o','ConnectTimeout=12','ubuntu@simson-vps.vipsy.in'];
const script=await readFile(path.join(root,'tests/native-video-fixture.py'),'utf8');
const ssh=(mode,directory='')=>execFileSync('ssh',[...args,`tr -d '\r' | sudo python3 - ${mode} ${directory}`],{input:script,encoding:'utf8',windowsHide:true,timeout:30000});
let fixture,tunnel,browser,server,page;
try{
  fixture=JSON.parse(ssh('setup'));
  assert.equal(fixture.ready,true);
  tunnel=spawn('ssh',[...args.slice(0,-1),'-N','-L','127.0.0.1:39088:127.0.0.1:19088',args.at(-1)],{windowsHide:true,stdio:'ignore'});
  for(let attempt=0;attempt<60;attempt++){
    try{await fetch('http://127.0.0.1:39088/');break;}catch{await new Promise(resolve=>setTimeout(resolve,200));}
  }
  server=createServer(async(request,response)=>{
    const files={'/transport/sip-ua.js':'transport/sip-ua.js','/version.js':'version.js'};
    if(files[request.url]){response.setHeader('Content-Type','text/javascript');response.end(await readFile(path.join(root,'src',files[request.url])));}
    else response.end('<!doctype html><title>Isolated SIP video fixture</title>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async ice=>{
    const {MinimalSIPUA}=await import('/transport/sip-ua.js');
    window.probeErrors=[];
    window.canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
    const context=canvas.getContext('2d');let frame=0;
    window.drawing=setInterval(()=>{context.fillStyle=++frame%2?'#27ad91':'#486fce';context.fillRect(0,0,320,180);},100);
    const audio=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const video=canvas.captureStream(10);
    const media=new MediaStream([...audio.getAudioTracks(),...video.getVideoTracks()]);
    window.source=new MinimalSIPUA({uri:'sip:probe-source@127.0.0.1',password:'fixture-only',wsUrl:'ws://127.0.0.1:39088/ws',iceServers:ice,
      onRegistered:()=>{window.sourceReady=true;},onError:error=>window.probeErrors.push('source: '+error.message)});
    source._localStream=media;
    source._pc=new RTCPeerConnection({iceServers:ice,bundlePolicy:'max-bundle'});
    media.getTracks().forEach(track=>source._pc.addTrack(track,media));
    window.viewer=new MinimalSIPUA({uri:'sip:probe-viewer@127.0.0.1',password:'fixture-only',wsUrl:'ws://127.0.0.1:39088/ws',iceServers:ice,
      captureMedia:()=>navigator.mediaDevices.getUserMedia({audio:true,video:false}),
      onRegistered:()=>{window.viewerReady=true;},onError:error=>window.probeErrors.push('viewer: '+error.message)});
    source.connect();viewer.connect();
  },fixture.ice);
  await page.waitForFunction(()=>window.sourceReady&&window.viewerReady,null,{timeout:25000});
  const originated=ssh('originate',fixture.root);
  assert.match(originated,/Success/);
  await page.waitForFunction(()=>window.source._callId,null,{timeout:20000});
  await page.evaluate(()=>{viewer._activeBridge='probe-room';return viewer.dial('probe-room');});
  await page.evaluate(()=>{window.statsTimer=setInterval(async()=>{
    if(!viewer._pc)return;
    const stats=await viewer._pc.getStats();
    const video=[...stats.values()].find(stat=>stat.type==='inbound-rtp'&&stat.kind==='video');
    const audio=[...stats.values()].find(stat=>stat.type==='inbound-rtp'&&stat.kind==='audio');
    if(video?.framesDecoded>0 && audio?.packetsReceived>0){window.nativeVideoResult={framesDecoded:video.framesDecoded,audioPackets:audio.packetsReceived,errors:probeErrors};clearInterval(window.statsTimer);}
  },200);});
  await page.waitForFunction(()=>Boolean(window.nativeVideoResult),null,{timeout:30000});
  const result=await page.evaluate(()=>window.nativeVideoResult);
  assert.ok(result.framesDecoded>0 && result.audioPackets>0);
  console.log(JSON.stringify({isolatedAsterisk:true,directPJSIP:true,...result}));
}catch(error){
  console.error(error.name+': '+error.message);
  if(page)console.error(JSON.stringify(await page.evaluate(async()=>{
    const result={errors:window.probeErrors};
    for(const name of ['source','viewer']){
      const peer=window[name]?._pc;
      result[name]={state:peer?.connectionState,ice:peer?.iceConnectionState,gathering:peer?.iceGatheringState,signaling:peer?.signalingState,localCandidates:peer?.localDescription?.sdp?.split('a=candidate:').length-1,localMedia:peer?.localDescription?.sdp?.split('\r\n').filter(line=>line.startsWith('m=')),remoteMedia:peer?.remoteDescription?.sdp?.split('\r\n').filter(line=>line.startsWith('m='))};
      if(peer)result[name].rtp=[...await peer.getStats().then(stats=>[...stats.values()])].filter(stat=>['inbound-rtp','outbound-rtp','candidate-pair'].includes(stat.type)).map(stat=>({type:stat.type,kind:stat.kind,packetsSent:stat.packetsSent,packetsReceived:stat.packetsReceived,framesDecoded:stat.framesDecoded,state:stat.state}));
    }
    return result;
  })));
  if(fixture?.root)console.error(ssh('diagnostics',fixture.root));
  process.exitCode=1;
}finally{
  await browser?.close();
  tunnel?.kill();
  if(server)await new Promise(resolve=>server.close(resolve));
  if(fixture?.root)console.log(ssh('cleanup',fixture.root).trim());
}
