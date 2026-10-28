import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const base=process.env.HA_URL;
const token=process.env.HA_ACCESS_TOKEN;
const entity=process.env.HA_CAMERA_ENTITY;
const fallback=process.env.HA_CAMERA_FALLBACK_ENTITY||'';
if(!base||!token||!entity)throw Error('Provide HA_URL, HA_ACCESS_TOKEN and HA_CAMERA_ENTITY in the process environment.');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage();
  page.on('console',message=>{if(message.text().startsWith('CAMERA_PROVIDER_ERROR'))console.log(message.text());});
  await page.goto(base.replace(/\/$/,'')+'/robots.txt',{waitUntil:'load'});
  await page.evaluate(async({token})=>{
    const pending=new Map(), subscriptions=new Map();let nextId=0;
    const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/websocket');
    const connected=new Promise((resolve,reject)=>{
      socket.onmessage=event=>{
        const message=JSON.parse(event.data);
        if(message.type==='auth_required')socket.send(JSON.stringify({type:'auth',access_token:token}));
        else if(message.type==='auth_ok')resolve();
        else if(message.type==='auth_invalid')reject(Error('HA rejected probe authentication'));
        else if(message.type==='event')subscriptions.get(message.id)?.(message.event);
        else if(message.type==='result'){
          const callback=pending.get(message.id);pending.delete(message.id);
          if(message.success)callback?.resolve(message.result);else callback?.reject(Error(message.error?.message||'HA request failed'));
        }
      };
      socket.onerror=()=>reject(Error('HA WebSocket connection failed'));
    });
    const request=body=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,...body}));});
    await connected;
    window.cameraProbeHass={callWS:request,onCameraProbeError:error=>console.log('CAMERA_PROVIDER_ERROR',JSON.stringify({code:error.code,message:String(error.message).replace(/rtsp[s]?:\/\/[^\s]+/g,'[redacted camera address]')})),connection:{subscribeMessage:async(callback,body)=>{
      const id=++nextId;subscriptions.set(id,callback);
      await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,...body}));});
      return ()=>{subscriptions.delete(id);request({type:'unsubscribe_events',subscription:id}).catch(()=>{});};
    }}};
    window.probeSocket=socket;
  },{token});
  await page.evaluate(async(forceHls)=>{
    const manifest=await (await fetch('/simson/www/runtime.json',{cache:'no-store'})).json();
    const asset=forceHls?manifest.assets.find(path=>/ha-camera-hls-/.test(path)):manifest.camera;
    const module=await import(new URL(asset,location.origin+'/simson/www/').href);
    window.openCameraSource=forceHls?module.openHlsCameraSource:module.openCameraSource;
  },process.env.HA_CAMERA_FORCE_HLS==='1');
  await page.waitForFunction(()=>Boolean(window.openCameraSource));
  await page.evaluate(async({entity,fallback})=>{
    window.cameraProbe=await window.openCameraSource(window.cameraProbeHass,entity,new AbortController().signal,[],fallback);
    const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;
    video.srcObject=window.cameraProbe.stream;document.body.append(video);window.cameraProbeVideo=video;await video.play();
  },{entity,fallback});
  await page.waitForFunction(()=>window.cameraProbeVideo.videoWidth>0,null,{timeout:20000});
  await page.evaluate(async()=>{
    const sender=new RTCPeerConnection(), receiver=new RTCPeerConnection();
    window.forwardPeers=[sender,receiver];
    const gathered=peer=>new Promise(resolve=>{if(peer.iceGatheringState==='complete'){resolve();return;}const timer=setTimeout(resolve,5000);peer.onicegatheringstatechange=()=>{if(peer.iceGatheringState==='complete'){clearTimeout(timer);resolve();}};});
    const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;
    document.body.append(video);window.forwardProbeVideo=video;
    receiver.ontrack=event=>{video.srcObject=new MediaStream([event.track]);video.play().catch(()=>{});};
    sender.addTrack(window.cameraProbe.stream.getVideoTracks()[0]);
    await sender.setLocalDescription(await sender.createOffer());await gathered(sender);
    await receiver.setRemoteDescription(sender.localDescription);
    await receiver.setLocalDescription(await receiver.createAnswer());await gathered(receiver);
    await sender.setRemoteDescription(receiver.localDescription);
  });
  await page.waitForFunction(()=>window.forwardProbeVideo.videoWidth>0,null,{timeout:20000});
  const result=await page.evaluate(async()=>{
    const camera=window.cameraProbe.peer?await window.cameraProbe.peer.getStats():null, forwarded=await window.forwardPeers[1].getStats();
    const decoded=stats=>[...stats.values()].filter(item=>item.type==='inbound-rtp'&&item.kind==='video').reduce((total,item)=>total+(item.framesDecoded||0),0);
    return {transport:window.cameraProbe.kind||'webrtc',camera_frames_decoded:camera?decoded(camera):window.cameraProbe.video.getVideoPlaybackQuality().totalVideoFrames,forwarded_frames_decoded:decoded(forwarded),
      camera_width:window.cameraProbeVideo.videoWidth,receiver_width:window.forwardProbeVideo.videoWidth};
  });
  if(result.camera_frames_decoded<1||result.forwarded_frames_decoded<1)throw Error('Video elements loaded without verified decoded frames');
  console.log(JSON.stringify(result));
  await page.evaluate(()=>{window.cameraProbe.close();window.forwardPeers.forEach(peer=>peer.close());window.probeSocket.close();});
}finally{await browser.close();}
