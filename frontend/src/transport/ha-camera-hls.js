import Hls from 'hls.js';

export async function openHlsCameraSource(hass, entityId, signal) {
  if(signal?.aborted)throw new DOMException('Call ended','AbortError');
  const video=document.createElement('video');
  if(!video.captureStream&&!video.mozCaptureStream)throw Error('This browser cannot forward HA camera streams. Use a supported Chromium browser or a working camera WebRTC provider.');
  video.muted=true;video.autoplay=true;video.playsInline=true;video.crossOrigin='anonymous';
  video.style.cssText='position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;left:0;bottom:0';
  document.body.append(video);
  let hls,captured,closed=false,resolved=false,timer,resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});
  const close=()=>{
    if(closed)return;closed=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
    captured?.getTracks().forEach(track=>track.stop());hls?.destroy();video.pause();video.removeAttribute('src');video.load();video.remove();
  };
  const fail=error=>{rejectReady(error);close();};
  const abort=()=>fail(new DOMException('Call ended','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{
    hass.onCameraProbeError?.({code:'hls_timeout',message:JSON.stringify({readyState:video.readyState,networkState:video.networkState,paused:video.paused,time:video.currentTime,width:video.videoWidth,buffered:video.buffered.length})});
    fail(Error('No live camera frames arrived from HA. Check the camera stream; call audio can continue.'));
  },30000);
  const decoded=()=>{
    if(closed||resolved||video.videoWidth<1)return;
    try{
      captured=(video.captureStream||video.mozCaptureStream).call(video);
      captured.getAudioTracks().forEach(track=>track.stop());
      const track=captured.getVideoTracks().find(track=>track.readyState==='live');
      if(!track)return;
      resolved=true;clearTimeout(timer);resolveReady({stream:new MediaStream([track]),video,kind:'hls',close});
    }catch{fail(Error('The browser could not forward the live camera video. Call audio can continue.'));}
  };
  video.onloadeddata=decoded;video.oncanplay=decoded;
  video.onerror=()=>fail(Error('The HA camera stream could not be decoded. Check its H.264 stream settings.'));
  try{
    const request=hass.callWS({type:'camera/stream',entity_id:entityId,format:'hls'});
    const response=await Promise.race([request,ready]);
    if(closed)throw new DOMException('Call ended','AbortError');
    const url=new URL(response.url,location.origin);
    if(url.origin!==location.origin||!url.pathname.startsWith('/api/hls/'))throw Error('HA returned an unexpected camera stream location.');
    if(Hls.isSupported()){
      hls=new Hls({lowLatencyMode:true,backBufferLength:10,maxBufferLength:8,maxMaxBufferLength:20});
      hls.on(Hls.Events.ERROR,(_,data)=>{hass.onCameraProbeError?.({code:'hls_error',message:JSON.stringify({type:data.type,details:data.details,fatal:data.fatal})});if(data.fatal)fail(Error('The HA live camera stream failed. Check stream availability and browser codec support.'));});
      hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>fail(Error('Camera playback was blocked. Retry from this browser.'))));
      hls.loadSource(url.href);hls.attachMedia(video);
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=url.href;video.play().catch(()=>fail(Error('Camera playback was blocked. Retry from this browser.')));
    }else throw Error('This browser cannot decode the HA live camera stream.');
    return await ready;
  }catch(error){close();throw error;}
}
