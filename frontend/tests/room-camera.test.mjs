import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';

test('a silent WebRTC camera timeout closes the subscription before HLS fallback',async()=>{
  const source=await readFile(new URL('../src/transport/ha-camera-source.js',import.meta.url),'utf8');
  const server=createServer((request,response)=>{
    response.setHeader('content-type',request.url.endsWith('.js')?'text/javascript':'text/html');
    response.end(request.url==='/camera.js'?source:request.url==='/ha-camera-hls.js'?
      'export async function openHlsCameraSource(){throw Error("HLS fallback reached");}':'<!doctype html><body></body>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
  try {
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
    const result=await page.evaluate(async()=>{
      const original=setTimeout;window.setTimeout=(callback,delay,...args)=>original(callback,delay===18000?100:delay,...args);
      const {openCameraSource}=await import('/camera.js');
      let unsubscribed=0;
      const hass={callWS:async()=>({configuration:{iceServers:[]}}),connection:{subscribeMessage:async()=>()=>{unsubscribed++;}}};
      try {await openCameraSource(hass,'camera.test',new AbortController().signal);}
      catch(error){return {error:error.message,unsubscribed};}
    });
    assert.equal(result.error,'HLS fallback reached');assert.equal(result.unsubscribed,1);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('HA camera track forwards decoded frames and abort releases its subscription',async()=>{
  const server=createServer((request,response)=>response.end('<!doctype html><body></body>'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
  try{
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
    const source=await readFile(new URL('../src/transport/ha-camera-source.js',import.meta.url),'utf8');
    await page.addScriptTag({type:'module',content:source+'\nwindow.openCameraSource=openCameraSource;'});
    await page.waitForFunction(()=>Boolean(window.openCameraSource));
    await page.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const draw=()=>{const context=canvas.getContext('2d');context.fillStyle=`hsl(${Date.now()%360},80%,50%)`;context.fillRect(0,0,320,180);};
      draw();window.drawTimer=setInterval(draw,40);window.sourceStream=canvas.captureStream(25);
      const camera=new RTCPeerConnection();window.cameraPeer=camera;
      camera.addTrack(window.sourceStream.getVideoTracks()[0],window.sourceStream);
      let callback;window.unsubscribed=0;
      const hass={callWS:async request=>{
        if(request.type==='camera/webrtc/get_client_config')return {configuration:{iceServers:[]}};
        if(request.type==='camera/webrtc/candidate')await camera.addIceCandidate(request.candidate);
      },connection:{subscribeMessage:async(handler,request)=>{
        callback=handler;camera.onicecandidate=event=>{if(event.candidate)callback({type:'candidate',candidate:event.candidate.toJSON()});};
        callback({type:'session',session_id:'camera-session'});
        await camera.setRemoteDescription({type:'offer',sdp:request.offer});
        await camera.setLocalDescription(await camera.createAnswer());
        callback({type:'answer',answer:camera.localDescription.sdp});
        return ()=>{window.unsubscribed++;};
      }}};
      window.abortCamera=new AbortController();window.cameraSource=await window.openCameraSource(hass,'camera.test',window.abortCamera.signal);
      const sender=new RTCPeerConnection(),receiver=new RTCPeerConnection();window.forwardPeers=[sender,receiver];
      const received=[],sent=[];
      sender.onicecandidate=event=>{if(event.candidate){if(receiver.remoteDescription)receiver.addIceCandidate(event.candidate);else received.push(event.candidate);}};
      receiver.onicecandidate=event=>{if(event.candidate){if(sender.remoteDescription)sender.addIceCandidate(event.candidate);else sent.push(event.candidate);}};
      const video=document.createElement('video');video.muted=true;video.autoplay=true;document.body.append(video);window.video=video;
      receiver.ontrack=event=>{video.srcObject=new MediaStream([event.track]);video.play();};
      sender.addTrack(window.cameraSource.stream.getVideoTracks()[0]);
      await sender.setLocalDescription(await sender.createOffer());await receiver.setRemoteDescription(sender.localDescription);
      for(const candidate of received)await receiver.addIceCandidate(candidate);
      await receiver.setLocalDescription(await receiver.createAnswer());await sender.setRemoteDescription(receiver.localDescription);
      for(const candidate of sent)await sender.addIceCandidate(candidate);
    });
    await page.waitForFunction(()=>window.video.videoWidth===320,null,{timeout:12000});
    const result=await page.evaluate(async()=>{
      const stats=await window.forwardPeers[1].getStats();
      const frames=[...stats.values()].find(item=>item.type==='inbound-rtp'&&item.kind==='video')?.framesDecoded;
      const track=window.cameraSource.stream.getVideoTracks()[0];window.abortCamera.abort();
      return {frames,unsubscribed:window.unsubscribed,closed:window.cameraSource.peer.connectionState,track:track.readyState};
    });
    assert.ok(result.frames>0);assert.equal(result.unsubscribed,1);assert.equal(result.closed,'closed');assert.equal(result.track,'ended');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
