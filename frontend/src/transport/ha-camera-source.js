export async function openCameraSource(hass, entityId, signal, fallbackIce = [], fallbackEntity = '') {
  try{return await openWebRTCCameraSource(hass,entityId,signal,fallbackIce,fallbackEntity);}
  catch(error){
    if(signal?.aborted||error?.name==='AbortError')throw error;
    if(!['generic_source_unsupported','provider_error','camera_track_timeout','camera_connection_failed'].includes(error.code)&&!/Camera does not support WebRTC/.test(error.message||''))throw error;
    const {openHlsCameraSource}=await import('./ha-camera-hls.js');
    return openHlsCameraSource(hass,entityId,signal);
  }
}

async function openWebRTCCameraSource(hass, entityId, signal, fallbackIce = [], fallbackEntity = '') {
  if (!hass?.connection?.subscribeMessage || !hass.callWS) throw Error('Home Assistant camera signaling is unavailable. Reconnect this dashboard.');
  const config = await hass.callWS({type:'camera/webrtc/get_client_config',entity_id:entityId});
  if(signal?.aborted)throw new DOMException('Call ended','AbortError');
  const peer = new RTCPeerConnection({...config.configuration,
    iceServers:config.configuration?.iceServers?.length?config.configuration.iceServers:fallbackIce});
  peer.addTransceiver('video',{direction:'recvonly'});
  if(config.dataChannel)peer.createDataChannel(config.dataChannel);
  let unsubscribe, sessionId, closed=false, timer, readyResolve, readyReject;
  const outgoing=[], incoming=[];
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  ready.catch(()=>{});
  const stream=new MediaStream();
  const close=()=>{
    if(closed)return;closed=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
    unsubscribe?.();peer.close();stream.getTracks().forEach(track=>track.stop());
  };
  const fail=(message,code)=>{const error=Error(message);error.code=code;readyReject(error);close();};
  const abort=()=>{readyReject(new DOMException('Call ended','AbortError'));close();};
  signal?.addEventListener('abort',abort,{once:true});
  const sendCandidate=async candidate=>hass.callWS({type:'camera/webrtc/candidate',entity_id:entityId,session_id:sessionId,candidate});
  peer.onicecandidate=event=>{
    if(!event.candidate||closed)return;
    const candidate=event.candidate.toJSON();
    if(sessionId)sendCandidate(candidate).catch(()=>fail('The camera rejected media connectivity. Audio can continue.'));
    else outgoing.push(candidate);
  };
  peer.ontrack=event=>{if(!closed&&event.track.kind==='video'){stream.addTrack(event.track);clearTimeout(timer);readyResolve({stream,peer,close});}};
  peer.onconnectionstatechange=()=>{if(peer.connectionState==='failed')fail('The room camera connection failed. Check Home Assistant WebRTC connectivity.','camera_connection_failed');};
  timer=setTimeout(()=>fail('No camera video track arrived. Check the Generic Camera stream and HA WebRTC provider.','camera_track_timeout'),18000);
  let chain=Promise.resolve();
  try{
    await peer.setLocalDescription(await peer.createOffer());
    if(closed)throw new DOMException('Call ended','AbortError');
    const subscription=hass.connection.subscribeMessage(message=>{
      chain=chain.then(async()=>{
        if(closed)return;
        if(message.type==='session'){
          sessionId=message.session_id;
          for(const candidate of outgoing.splice(0))await sendCandidate(candidate);
        }else if(message.type==='answer'){
          await peer.setRemoteDescription({type:'answer',sdp:message.answer});
          for(const candidate of incoming.splice(0))await peer.addIceCandidate(candidate);
        }else if(message.type==='candidate'){
          if(peer.remoteDescription)await peer.addIceCandidate(message.candidate);else incoming.push(message.candidate);
        }else if(message.type==='error'){
          hass.onCameraProbeError?.(message);
          fail('Home Assistant could not open this camera for WebRTC ('+String(message.code||'provider_error').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)+'). Check its live stream/provider.',message.code==='go2rtc_webrtc_offer_failed'&&message.message==='Stream source is not supported by go2rtc'?'generic_source_unsupported':'provider_error');
        }
      }).catch(()=>fail('Camera signaling failed. The call audio is independent.'));
    },{type:'camera/webrtc/offer',entity_id:entityId,offer:peer.localDescription.sdp});
    subscription.then(value=>{unsubscribe=value;if(closed)unsubscribe?.();}).catch(()=>{});
    await Promise.race([subscription,ready]);
    return await ready;
  }catch(error){
    close();
    if(error.code==='generic_source_unsupported'&&fallbackEntity&&fallbackEntity!==entityId&&!signal?.aborted)
      return openWebRTCCameraSource(hass,fallbackEntity,signal,fallbackIce);
    throw error;
  }
}
