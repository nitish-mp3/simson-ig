import {chromium} from '@playwright/test';

const base=process.env.HA_URL,token=process.env.HA_ACCESS_TOKEN,node=process.env.HA_NODE_ID,room=process.env.HA_ROOM_ID;
if(!base||!token||!node||!room)throw Error('Explicit HA_URL, HA_ACCESS_TOKEN, HA_NODE_ID and HA_ROOM_ID are required. This probe places a real room call.');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
let page;
try{
  const context=await browser.newContext({permissions:['microphone']});page=await context.newPage();
  page.on('pageerror',error=>console.log('BROWSER_ERROR',String(error.message).replace(/(?:https?|rtsp):\/\/\S+/g,'[address omitted]').slice(0,200)));
  await page.goto(base.replace(/\/$/,'')+'/robots.txt');
  await page.evaluate(async({token,node,room})=>{
    const pending=new Map(),subscriptions=new Map();let sequence=0;
    const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/websocket');window.probeSocket=socket;
    const opened=new Promise((resolve,reject)=>{
      socket.onmessage=event=>{
        const message=JSON.parse(event.data);
        if(message.type==='auth_required')socket.send(JSON.stringify({type:'auth',access_token:token}));
        else if(message.type==='auth_ok')resolve();
        else if(message.type==='auth_invalid')reject(Error('HA authentication failed'));
        else if(message.type==='event')subscriptions.get(message.id)?.(message.event);
        else if(message.type==='result'){
          const handler=pending.get(message.id);pending.delete(message.id);clearTimeout(handler?.timer);
          if(message.success)handler?.resolve(message.result);else{const error=Error(message.error?.message||'HA request failed');error.code=message.error?.code;handler?.reject(error);}
        }
      };
      socket.onerror=()=>reject(Error('HA signaling connection failed'));
      socket.onclose=()=>{for(const handler of pending.values()){clearTimeout(handler.timer);handler.reject(Error('HA signaling disconnected'));}pending.clear();};
    });
    const request=body=>new Promise((resolve,reject)=>{
      const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('HA signaling request timed out'));},25000);
      pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,...body}));
    });
    const subscribe=async(callback,body)=>{
      const id=++sequence;subscriptions.set(id,callback);
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('HA subscription timed out')),15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,...body}));});
      return ()=>{subscriptions.delete(id);request({type:'unsubscribe_events',subscription:id}).catch(()=>{});};
    };
    await opened;window.probeRequest=request;
    const user=await request({type:'auth/current_user'});
    const states=Object.fromEntries((await request({type:'get_states'})).filter(state=>/^(sensor\.simson_|camera\.|media_player\.)/.test(state.entity_id)).map(state=>[state.entity_id,state]));
    const hass={user,states,connection:{subscribeMessage:subscribe,subscribeEvents:(callback,event_type)=>subscribe(callback,{type:'subscribe_events',event_type})},
      callWS:request,callService:(domain,service,service_data)=>request({type:'call_service',domain,service,service_data}),
      callApi:async(method,path,data)=>{
        const response=await fetch('/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
        if(!response.ok)throw Error('HA media API returned '+response.status);return response.json();
      }};
    window.probeHass=hass;
    const config=await request({type:'call_service',domain:'simson',service:'get_room_configuration',service_data:{},return_response:true});
    const profile=config.response.nodes.find(item=>item.node_id===node)?.rooms.find(item=>item.room_id===room);
    if(!profile||profile.room_user_id!==user.id)throw Error('Sign in as the configured room source user');
    if(!config.response.capabilities?.ha_camera)throw Error('The room media backend has not loaded');
    const microphone=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    microphone.getTracks().forEach(track=>track.stop());
    const manifest=await (await fetch('/simson/www/runtime.json',{cache:'no-store'})).json();
    await import(new URL(manifest.runtime,location.origin+'/simson/www/').href);
    const session=document.createElement('simson-call-session');session.setConfig({node_id:node});session.hass=hass;document.body.append(session);window.probeCall=session;
    await subscribe(event=>{
      if(!event.data?.entity_id?.startsWith('sensor.simson_'))return;
      const next={...hass.states};if(event.data.new_state)next[event.data.entity_id]=event.data.new_state;else delete next[event.data.entity_id];
      hass.states=next;session.hass={...hass};
    },{type:'subscribe_events',event_type:'state_changed'});
    const result=await request({type:'call_service',domain:'simson',service:'start_room_call',service_data:{node_id:node,room_id:room,request_id:'live-probe-'+crypto.randomUUID()},return_response:true});
    window.probeRoomSession=result.response;
    if(!result.response.call_id)throw Error('The room call did not return an exact call ID');
    session._onHAUserCallStarted({node_id:node,call_id:result.response.call_id,caller_user_id:user.id,target_user_id:profile.caregiver_user_id,target_user_name:'Caregiver',call_type:'video',interactive:true});
    await session._joinUserCall();
  },{token,node,room});
  console.log('ROOM_CALL_STARTED',await page.evaluate(()=>({session_id:window.probeRoomSession.session_id,call_id:window.probeRoomSession.call_id})));
  let passed=false;
  for(let index=0;index<60;index++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const result=await page.evaluate(async()=>{
      const call=window.probeCall,peer=call._pc,stats=peer?[...((await peer.getStats()).values())]:[];
      const sum=(type,kind,key)=>stats.filter(item=>item.type===type&&item.kind===kind).reduce((total,item)=>total+(item[key]||0),0);
      const state=Object.values(window.probeHass.states).find(item=>item.attributes.simson_room&&item.attributes.session_id===window.probeRoomSession.session_id);
      return {connection:peer?.connectionState||'waiting',source_state:call._callState(),source_call:call._currentCallId,initiated_here:call._initiatedHere,is_caller:call._isCaller,starting_media:call._startingWebRTC,audio_received:sum('inbound-rtp','audio','packetsReceived'),audio_sent:sum('outbound-rtp','audio','packetsSent'),
        video_received:sum('inbound-rtp','video','framesDecoded'),video_sent:sum('outbound-rtp','video','framesEncoded'),
        room_state:state?.state,components:state?.attributes.components,relay_viewers:call._roomDisplayPublisher?.peers.size||0,media_error:call._mediaDeviceError||'',action_error:call._actionError||''};
    });
    if(index%5===0)console.log('ROOM_MEDIA',JSON.stringify(result));
    if(result.connection==='connected'&&result.audio_received>0&&result.audio_sent>0&&result.video_sent>0&&result.video_received>0&&result.components?.display==='ready'){
      console.log('END_TO_END_MEDIA_VERIFIED',JSON.stringify(result));passed=true;break;
    }
    if(['ended','attention'].includes(result.room_state))break;
  }
  if(!passed)throw Error('Not all real media paths and TV decoded-frame acknowledgement were verified');
}finally{
  if(page&&!page.isClosed()){
    try{await page.evaluate(async({node,room})=>{
      const session=window.probeRoomSession;
      if(session?.session_id)await window.probeRequest({type:'call_service',domain:'simson',service:'end_room_call',service_data:{node_id:node,room_id:room,session_id:session.session_id},return_response:true});
      window.probeCall?._cleanupWebRTC({endCall:true});window.probeCall?.remove();window.probeSocket?.close();
    },{node,room});console.log('EXACT_TEST_SESSION_CLEANED');}catch{console.log('CLEANUP_NEEDS_VERIFICATION');}
  }
  await browser.close();
}
