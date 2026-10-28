import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const integrationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(integrationRoot);
let server, browser, origin;
const fixture = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#0e1420"><main style="max-width:530px;margin:24px auto" id="mount"></main></body></html>';

before(async () => {
  server = createServer(async (request,response) => {
    const url = new URL(request.url,'http://localhost');
    let file;
    if (url.pathname.startsWith('/simson/www/')) file=path.join(integrationRoot,'custom_components/simson/www',url.pathname.slice(12));
    else if(url.pathname.startsWith('/test-src/'))file=path.join(integrationRoot,'frontend/src',url.pathname.slice(10));
    else if(url.pathname.startsWith('/local/'))file=path.join(integrationRoot,'www',url.pathname.slice(7));
    else if(url.pathname.startsWith('/addon/ui/'))file=path.join(root,'addon/app/ui',url.pathname.slice(10));
    else if(url.pathname.startsWith('/addon/api/')) {
      const key=url.pathname.split('/').pop();
      const value=key==='status'?{node_id:'office',vps_connected:true}:key==='nodes'?{nodes:[]}:['sip-endpoints','advanced-routes'].includes(key)?[]:{};
      response.writeHead(200,{'content-type':'application/json'});response.end(JSON.stringify(value));return;
    } else if(url.pathname==='/addon/') {
      response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="ui/styles.css"><script>window.__SIMSON__={provisioned:true,version:"5.0.0"}</script><script type="module" src="ui/app.js"></script>');return;
    } else if(url.pathname==='/api/webrtc-config') {
      response.writeHead(200,{'content-type':'application/json'});response.end('{"ice_servers":[],"sip":{"enabled":false}}');return;
    } else {response.writeHead(200,{'content-type':'text/html'});response.end(fixture);return;}
    try {
      let data=await readFile(file);
      const headers={'content-type':file.endsWith('.css')?'text/css':'text/javascript','vary':'Accept-Encoding'};
      if(request.headers['accept-encoding']?.includes('gzip')) {
        try {data=await readFile(file+'.gz');headers['content-encoding']='gzip';} catch {}
      }
      response.writeHead(200,headers);response.end(data);
    }
    catch {response.writeHead(404);response.end('missing');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  const executablePath=process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
  browser=await chromium.launch({headless:true,executablePath,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  await mkdir(path.join(integrationRoot,'frontend/test-results'),{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});

async function load(page) {
  await page.goto(origin);
  await page.addScriptTag({type:'module',url:origin+'/simson/www/simson-card.js'});
  await page.evaluate(()=>{
    window.events={};window.calls=[];window.unsubscribed=0;
    window.mockHass={
      user:{id:'user1',name:'Amit'},
      states:{'sensor.simson_office_connection':{state:'connected',attributes:{}},'sensor.simson_office_call_state':{state:'idle',attributes:{}},'sensor.simson_office_calls_count':{state:'0',attributes:{}}},
      connection:{subscribeEvents:async(callback,event)=>{window.events[event]=callback;return()=>{window.unsubscribed++;delete window.events[event];};}},
      callService:async(domain,service,data)=>{window.calls.push({domain,service,data});},
    };
    const shell=document.createElement('simson-relay-card');
    shell.setConfig({title:'Simson',node_id:'office',target_nodes:['Studio','Front desk']});
    shell.hass=window.mockHass;
    document.querySelector('#mount').append(shell);
  });
  await page.locator('simson-card-runtime').waitFor();
  await page.getByRole('heading',{name:'Who’s on your mind?'}).waitFor();
}

test('registers all aliases before the runtime finishes downloading',async()=>{
  const page=await browser.newPage();
  let release;
  const gate=new Promise(resolve=>release=resolve);
  await page.route('**/chunks/card-*.js',async route=>{await gate;await route.continue();});
  await page.goto(origin);
  await page.addScriptTag({type:'module',url:origin+'/simson/www/simson-card.js'});
  assert.equal(await page.evaluate(()=>['simson-relay-card','simson-card','simson-call-card'].every(name=>Boolean(customElements.get(name)))),true);
  release();await page.close();
});

test('dedicated Cast screen loads without the shared card bootstrap or lazy chunks',async()=>{
  const page=await browser.newPage();
  try {
    const scripts=[];
    page.on('request',request=>{if(request.resourceType()==='script')scripts.push(request.url());});
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.addScriptTag({type:'module',url:origin+'/simson/www/simson-cast-room-screen.js'});
    await page.evaluate(()=>{
      const card=document.createElement('simson-cast-room-screen');
      card.setConfig({node_id:'site',room_id:'living',title:'Living room call'});
      card.hass={callWS:async()=>({response:{}})};
      document.querySelector('#mount').append(card);
    });
    await page.getByText('Waiting for a room call',{exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Living room call'}).count(),1);
    assert.equal(await page.evaluate(()=>Boolean(customElements.get('simson-relay-card'))),false);
    assert.equal(scripts.some(url=>url.includes('/chunks/')||url.includes('/simson-card.js')),false);
  } finally {
    await page.close();
  }
});

test('room station is opt-in, owner-scoped, skips old calls and joins a new exact room session',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    window.roomRequests=[];
    window.mockHass.states['sensor.room']={state:'idle',attributes:{simson_room:true,node_id:'office',room_id:'101',room_user_id:'user1',audio_mode:'browser',video_mode:'ha_camera',revision:1,session_id:'old-session'}};
    window.mockHass.callWS=async request=>{
      window.roomRequests.push(request);
      if(request.service==='get_room_media')return {response:{session_id:request.service_data.session_id}};
      return {response:{owned:true}};
    };
    const station=document.createElement('simson-room-source-card');station.setConfig({entity:'sensor.room'});station.hass=window.mockHass;
    document.getElementById('mount').append(station);window.station=station;
  });
  await page.waitForFunction(()=>window.station._display);
  assert.equal(await page.evaluate(()=>window.roomRequests.length),0);
  await page.evaluate(()=>window.station._display._arm());
  const result=await page.evaluate(async()=>{
    const station=window.station._display;
    await station.updateComplete;
    const session=station._card.session;window.sourceJoins=[];
    session._onHAUserCallStarted=event=>{window.sourceJoins.push(event);};session._joinUserCall=()=>{};
    await station._tick();
    const before=window.sourceJoins.length;
    const state=window.mockHass.states['sensor.room'];state.state='ringing';Object.assign(state.attributes,{session_id:'new-session',call_id:'new-call',target_user_id:'pika',started_at:Date.now()/1000+1});
    await station._tick();await station._tick();
    const calls=window.sourceJoins.slice();await station._disarm();
    return {before,calls,armed:station._armed,release:window.roomRequests.some(request=>request.service_data?.operation==='release')};
  });
  assert.equal(result.before,0);assert.equal(result.calls.length,1);assert.equal(result.calls[0].call_id,'new-call');assert.equal(result.armed,false);assert.equal(result.release,true);
  await page.close();
});

test('room station rejects other users and SIP profiles before requesting a microphone',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    window.microphoneRequests=0;navigator.mediaDevices.getUserMedia=async()=>{window.microphoneRequests++;throw Error('must not open');};
    window.mockHass.callWS=async()=>({response:{}});
    window.mockHass.states['sensor.room']={state:'idle',attributes:{simson_room:true,node_id:'office',room_id:'101',room_user_id:'another-user',audio_mode:'browser'}};
    const station=document.createElement('simson-room-source-card');station.setConfig({entity:'sensor.room'});station.hass=window.mockHass;document.getElementById('mount').append(station);window.station=station;
  });
  await page.waitForFunction(()=>window.station._display);
  const errors=await page.evaluate(async()=>{
    const station=window.station._display;await station._arm();const owner=station._error;
    Object.assign(window.mockHass.states['sensor.room'].attributes,{room_user_id:'user1',audio_mode:'sip'});await station._arm();
    return {owner,sip:station._error,microphones:window.microphoneRequests};
  });
  assert.match(errors.owner,/Sign in/);assert.match(errors.sip,/SIP audio/);assert.equal(errors.microphones,0);await page.close();
});

test('mobile bootstrap recovers a stale runtime and tolerates malformed third-party metadata',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{window.customCards={invalid:true};});
  let runtimeRequests=0;
  await page.route('**/chunks/card-*.js*',route=>{
    runtimeRequests++;
    return runtimeRequests===1?route.fulfill({status:404,body:'old release removed'}):route.continue();
  });
  await load(page);
  assert.equal(runtimeRequests,2);
  assert.equal(await page.evaluate(()=>Boolean(customElements.get('simson-call-panel'))),true);
  await page.close();
});

test('opening the mobile dashboard during ringing restores the recipient popup without an event',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});await load(page);
  await page.evaluate(()=>{
    document.querySelector('simson-relay-card').remove();
    window.mockHass.user={id:'recipient',name:'nitish'};
    window.mockHass.states['sensor.simson_office_call_state']={state:'ringing',attributes:{
      call_id:'cold-incoming',direction:'incoming',target_user_id:'recipient',remote_name:'ds',remote_label:'ds',remote_node_id:'office',call_type:'voice'}};
    const shell=document.createElement('simson-relay-card');shell.setConfig({node_id:'office'});shell.hass=window.mockHass;
    document.querySelector('#mount').append(shell);
  });
  await page.getByText('ds',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:/Answer/}).first().waitFor();
  assert.equal(await page.evaluate(()=>window.calls.filter(call=>['make_call','answer_call','reject_call'].includes(call.service)).length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/incoming-mobile.png'),fullPage:true});
  await page.close();
});

test('notification call panel consumes only the exact authenticated decline link',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    history.replaceState({},'', '/simson-call?simson_action=decline&simson_call=panel-call&simson_node=office');
    document.querySelector('simson-relay-card').remove();
    const panel=document.createElement('simson-call-panel');panel.hass=window.mockHass;
    document.querySelector('#mount').append(panel);
  });
  await page.waitForFunction(()=>window.calls.some(call=>call.service==='reject_call'));
  const calls=await page.evaluate(()=>window.calls.filter(call=>call.service==='reject_call'));
  assert.equal(calls.length,1);
  assert.equal(calls[0].data.call_id,'panel-call');
  assert.equal(await page.evaluate(()=>document.querySelector('simson-call-panel')._card._config.node_id),'office');
  await page.close();
});

test('cold loads consistently, keeps input and audio DOM stable on HA updates',async()=>{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await load(page);
  await page.locator('#node-input').fill('7016');
  const result=await page.evaluate(async()=>{
    const card=document.querySelector('simson-relay-card')._card;
    const input=card.shadowRoot.querySelector('#node-input');const audio=card.session._remoteAudio;
    let renders=0;const render=card.render.bind(card);card.render=()=>{renders++;return render();};
    for(let index=0;index<100;index++)card.hass={...window.mockHass,states:{...window.mockHass.states,['sensor.unrelated_'+index]:{state:index}}};
    await card.updateComplete;
    card.session._render();await card.session.updateComplete;await card.updateComplete;
    return{sameInput:input===card.shadowRoot.querySelector('#node-input'),sameAudio:audio===card.session._remoteAudio,value:input.value,renders};
  });
  assert.deepEqual(result,{sameInput:true,sameAudio:true,value:'7016',renders:1});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/card-desktop.png'),fullPage:true});
  for(let iteration=0;iteration<3;iteration++)await load(page);
  await page.close();
});

test('dial routes and service failures are visible without throwing configuration errors',async()=>{
  const page=await browser.newPage();await load(page);
  await page.locator('#node-input').fill('1040');await page.locator('button[aria-label="Place call"]').click();
  await page.waitForFunction(()=>window.calls.some(call=>call.service==='make_call'));
  assert.equal(await page.evaluate(()=>window.calls.find(call=>call.service==='make_call').data.target_id),'asterisk_1040');
  await page.evaluate(()=>window.events.simson_call_status({data:{call_id:'first-call',status:'failed',direction:'outgoing',caller_user_id:'user1'}}));
  await page.evaluate(()=>{window.mockHass.callService=async()=>{throw Error('Gateway unavailable');};});
  await page.waitForTimeout(700);await page.locator('button[aria-label="Place call"]').click();
  await page.getByRole('alert').filter({hasText:'Gateway unavailable'}).waitFor();
  await page.close();
});

test('device preview persists through renders and releases tracks on navigation',async()=>{
  const page=await browser.newPage();await load(page);
  await page.getByRole('button',{name:'Devices',exact:true}).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Test devices',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('simson-relay-card')._card.session._mediaPreviewStream?.getVideoTracks().length);
  const stable=await page.evaluate(async()=>{
    const card=document.querySelector('simson-relay-card')._card;window.preview=card.session._mediaPreviewStream;
    const video=card.shadowRoot.querySelector('#media-local-preview');card.session._render();await card.session.updateComplete;await card.updateComplete;
    return video===card.shadowRoot.querySelector('#media-local-preview') && video.srcObject===window.preview;
  });assert.equal(stable,true);
  await page.getByRole('button',{name:'Dial',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.preview.getTracks().every(track=>track.readyState==='ended')),true);
  await page.close();
});

test('mobile card and addon pages render without horizontal overflow or JS errors',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await load(page);await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/card-mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Devices',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  try {await access(path.join(root,'addon/app/ui/app.js'));}catch{await page.close();return;}
  await page.goto(origin+'/addon/');
  await page.locator('#content .grid').first().waitFor();
  for(const section of ['routing','sip','media','automation','advanced','overview']) {
    await page.locator(`[data-page="${section}"]`).first().evaluate(element=>element.click());
    await page.waitForFunction(()=>!document.querySelector('#content .page-loading'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,section);
  }
  await page.locator('[data-page="media"]').first().evaluate(element=>element.click());
  await page.locator('.media-layout').waitFor();
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/addon-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/addon-desktop.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('addon device and routing sections preserve drafts when collapsed or filtered',async()=>{
  try {await access(path.join(root,'addon/app/ui/app.js'));}catch{return;}
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/addon/api/sip-endpoints',route=>route.fulfill({json:[{id:'1040',extension:'1040',username:'1040',description:'Kitchen',registered:true}]}));
  await page.goto(origin+'/addon/');
  await page.locator('#content .grid').first().waitFor();
  await page.locator('[data-page="sip"]').first().click();
  await page.getByText('Configure 1040 Kitchen',{exact:true}).click();
  const field=page.locator('[data-sip-id="1040"][data-sip-key="description"]');
  await field.fill('Kitchen draft');
  const search=page.getByPlaceholder('Filter by name, extension or status');
  await search.fill('no match');assert.equal(await field.isVisible(),false);
  await search.fill('1040');assert.equal(await field.inputValue(),'Kitchen draft');
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/addon-devices.png'),fullPage:true});
  await page.locator('[data-page="routing"]').first().click();
  await page.getByRole('button',{name:'Multi-level routes',exact:true}).click();
  assert.equal(await page.locator('.advanced-routing').isVisible(),true);
  await page.getByRole('button',{name:'Destinations',exact:true}).click();
  assert.equal(await page.locator('.advanced-routing').isVisible(),false);
  await page.close();
});

test('a failed runtime download displays retry and recovers without a dashboard refresh',async()=>{
  const page=await browser.newPage();let blocked=true;
  await page.route('**/chunks/card-*.js*',route=>blocked ? route.abort('failed') : route.continue());
  await page.goto(origin);await page.addScriptTag({type:'module',url:origin+'/simson/www/simson-card.js'});
  await page.evaluate(()=>{
    const shell=document.createElement('simson-relay-card');shell.setConfig({node_id:'office'});document.querySelector('#mount').append(shell);
  });
  await page.getByRole('button',{name:'Retry',exact:true}).waitFor();blocked=false;
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.locator('simson-card-runtime').waitFor();await page.close();
});

test('split cards share one session and offline states never show phantom calls',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    for(const type of ['simson-dial-card','simson-live-call-card','simson-history-card']) {
      const shell=document.createElement(type);
      shell.setConfig({node_id:'office'});shell.hass=window.mockHass;
      document.querySelector('#mount').append(shell);
    }
  });
  await page.getByRole('heading',{name:'Ready for your next call'}).waitFor();
  assert.equal(await page.evaluate(()=>document.querySelectorAll('simson-call-session').length),1);
  for(const state of ['unavailable','unknown','ended','failed']) {
    await page.evaluate(state=>{
      window.mockHass={...window.mockHass,states:{...window.mockHass.states,'sensor.simson_office_connection':{state:'unavailable',attributes:{}},'sensor.simson_office_call_state':{state,attributes:{}}}};
      document.querySelectorAll('#mount > *').forEach(shell=>shell.hass=window.mockHass);
    },state);
    await page.waitForTimeout(30);
    assert.equal(await page.getByRole('button',{name:'End call',exact:true}).count(),0);
  }
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/split-cards.png'),fullPage:true});
  await page.evaluate(()=>document.querySelector('simson-relay-card').remove());
  assert.equal(await page.evaluate(()=>document.querySelectorAll('simson-call-session').length),1);
  assert.equal(await page.evaluate(()=>window.unsubscribed),0);
  await page.evaluate(()=>document.querySelector('#mount').replaceChildren());
  await page.waitForFunction(()=>!document.querySelector('simson-call-session'));
  assert.ok(await page.evaluate(()=>window.unsubscribed)>0);
  await page.close();
});

test('dialing appears immediately and unrelated active calls never acquire media',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    const host=document.querySelector('simson-relay-card')._card.session;
    window.mediaStarts=0;host._startSIPCall=()=>{window.mediaStarts++;return Promise.resolve();};
    window.mockHass={...window.mockHass,states:{...window.mockHass.states,
      'sensor.simson_office_call_state':{state:'active',attributes:{call_id:'private',direction:'outgoing',call_type:'sip',sip_bridge_id:'private-bridge'}}}};
    document.querySelector('simson-relay-card').hass=window.mockHass;
  });
  await page.getByRole('button',{name:'Place call'}).waitFor();
  assert.equal(await page.evaluate(()=>window.mediaStarts),0);
  await page.locator('#node-input').fill('59330025');
  await page.getByRole('button',{name:'Place call'}).click();
  await page.getByText('Connecting to your call service',{exact:true}).waitFor({timeout:500});
  await page.evaluate(()=>window.events.simson_call_status({data:{call_id:'mine',status:'ringing',direction:'outgoing',caller_user_id:'user1',remote_node_id:'phone:59330025',call_type:'sip'}}));
  await page.getByText('The destination is being called',{exact:true}).waitFor({timeout:500});
  assert.equal(await page.evaluate(()=>window.mediaStarts),0);
  await page.close();
});

test('renamed sensor prefixes share a canonical-node session and request media for that node',async()=>{
  const page=await browser.newPage();await load(page);
  const result=await page.evaluate(async()=>{
    document.querySelector('#mount').replaceChildren();
    window.mediaPaths=[];
    window.mockHass={...window.mockHass,states:{
      'sensor.simson_install_slug_connection':{state:'connected',attributes:{node_id:'office'}},
      'sensor.simson_install_slug_call_state':{state:'idle',attributes:{}},
      'sensor.simson_install_slug_calls_count':{state:'0',attributes:{}},
    },callApi:async(method,path)=>{window.mediaPaths.push(path);return {sip:{enabled:false}};}};
    for(const node of ['install_slug','office']) {
      const shell=document.createElement('simson-relay-card');
      shell.setConfig({node_id:node,view:node==='office'?'live':'dial'});
      shell.hass=window.mockHass;
      document.querySelector('#mount').append(shell);
    }
    await new Promise(resolve=>setTimeout(resolve,250));
    const hosts=[...document.querySelectorAll('#mount > *')].map(shell=>shell._card.session);
    hosts[0]._currentCallId='owned-call';
    hosts[0]._webrtcConfig=null;
    hosts[0]._webrtcConfigNextRetryAt=0;
    await hosts[0]._fetchWebRTCConfig();
    return {same:hosts[0]===hosts[1],node:hosts[0]._nodeId(),connected:hosts[0]._isConnected(),paths:window.mediaPaths};
  });
  assert.equal(result.same,true);
  assert.equal(result.node,'office');
  assert.equal(result.connected,true);
  assert.ok(result.paths.length>0);
  assert.ok(result.paths.every(value=>value.includes('node_id=office')));
  await page.close();
});

test('Mauritius card dialing preserves +230 and the explicitly selected 6202 trunk',async()=>{
  const page=await browser.newPage();await load(page);
  await page.locator('#node-input').fill('+23059330025');
  await page.evaluate(()=>document.querySelector('simson-relay-card')._card.session._pstnTrunkDraft='6202');
  await page.getByRole('button',{name:'Place call'}).click();
  await page.waitForFunction(()=>window.calls.some(call=>call.service==='make_call'));
  const call=await page.evaluate(()=>window.calls.find(call=>call.service==='make_call'));
  assert.deepEqual(call.data,{phone_number:'+23059330025',trunk:'6202',call_type:'sip',caller_user_id:'user1'});
  await page.getByText('Connecting to your call service',{exact:true}).waitFor();
  await page.close();
});

test('user-script popup is private, immediate and requires explicit browser media intent',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});await load(page);
  const event={node_id:'office',call_id:'script-call',caller_user_id:'user1',target_user_id:'user2',target_user_name:'Recipient',call_type:'video',interactive:true};
  await page.evaluate(event=>{
    const host=document.querySelector('simson-relay-card')._card.session;
    window.mediaStarts=0;host._startWebRTC=()=>{window.mediaStarts++;return Promise.resolve();};
    window.events.simson_user_call_started({data:{...event,caller_user_id:'observer'}});
  },event);
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.evaluate(event=>window.events.simson_user_call_started({data:event}),event);
  await page.getByRole('dialog',{name:'Your call'}).waitFor({timeout:500});
  await page.getByRole('button',{name:'Use this browser for audio & video'}).waitFor();
  const bounds=await page.getByRole('dialog').locator('.call-dialog').boundingBox();
  assert.ok(bounds.y>=0 && bounds.y+bounds.height<=844 && bounds.x>=0 && bounds.x+bounds.width<=390);
  await page.getByRole('dialog').getByRole('button',{name:'Minimize'}).waitFor();
  await page.evaluate(()=>window.events.simson_call_status({data:{node_id:'office',call_id:'script-call',status:'active',direction:'outgoing',caller_user_id:'user1',target_user_id:'user2',call_type:'video'}}));
  assert.equal(await page.evaluate(()=>window.mediaStarts),0);
  await page.getByRole('button',{name:'Use this browser for audio & video'}).click();
  assert.equal(await page.evaluate(()=>window.mediaStarts),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/user-call-popup-mobile.png'),fullPage:true});
  await page.waitForTimeout(700);
  await page.getByRole('dialog').getByRole('button',{name:'End call'}).click();
  await page.waitForFunction(()=>!document.querySelector('simson-relay-card')._card.session._view.hasCall);
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.ok(await page.evaluate(()=>window.calls.some(call=>call.service==='hangup_call'&&call.data.call_id==='script-call')));
  await page.close();
});

test('per-user card detects its node, opens immediate controls and does not duplicate buttons as contacts',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});await load(page);
  await page.evaluate(()=>{
    window.mockHass.states['sensor.recipient']={state:'ready',attributes:{simson_contact:true,node_id:'office',user_id:'user2',user_name:'Recipient'}};
    window.mockHass.states['button.recipient']={state:'unknown',attributes:{simson_contact:true,simson_call_button:true,node_id:'office',user_id:'user2'}};
    const shell=document.createElement('simson-user-card');shell.setConfig({entity:'sensor.recipient'});shell.hass=window.mockHass;
    document.querySelector('#mount').replaceChildren(shell);
  });
  await page.getByRole('button',{name:'Call Recipient',exact:true}).waitFor();
  await page.getByRole('button',{name:'Call Recipient',exact:true}).click();
  await page.getByText('Connecting to your call service',{exact:true}).waitFor({timeout:500});
  assert.deepEqual(await page.evaluate(()=>window.calls.find(call=>call.service==='call_user').data),{entity_id:'sensor.recipient',call_type:'voice'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.close();
});

test('notification handoff invokes the exact authenticated call action once',async()=>{
  for(const action of ['answer','decline']) {
    const page=await browser.newPage();await load(page);
    await page.evaluate(action=>{
      const shell=document.querySelector('simson-relay-card');
      const host=shell._card.session;
      window.calls=[];host._notificationHandoffChecked=false;
      history.replaceState({},'',`/?simson_action=${action}&simson_call=notification-call&simson_node=office`);
      shell.hass={...window.mockHass};
      shell.hass={...window.mockHass};
    },action);
    await page.waitForFunction(()=>window.calls.length>0);
    const calls=await page.evaluate(()=>window.calls.filter(call=>['answer_call','reject_call'].includes(call.service)));
    assert.equal(calls.length,1);
    assert.equal(calls[0].service,action==='answer'?'answer_call':'reject_call');
    assert.equal(calls[0].data.call_id,'notification-call');
    assert.equal(await page.evaluate(()=>location.search),'');
    await page.close();
  }
});

test('door card does not start calls or live streaming on page load',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    const card=document.createElement('simson-door-phone-card');
    card.setConfig({node_id:'office',extension:'1603'});card.hass=window.mockHass;
    document.querySelector('#mount').replaceChildren(card);
  });
  await page.getByRole('button',{name:'Call door phone'}).waitFor();
  assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.service==='make_call').length),0);
  assert.equal(await page.evaluate(()=>document.querySelector('simson-door-phone-card')._card.shadowRoot.querySelector('simson-door-camera')),null);
  await page.close();
});

test('SIP browser offer receives H264 video without acquiring the local camera',async()=>{
  const page=await browser.newPage();await load(page);
  const result=await page.evaluate(async()=>{
    const manifest=await (await fetch('/simson/www/runtime.json')).json();
    const source=manifest.assets.find(asset=>asset.includes('sip-ua-'));
    const {MinimalSIPUA}=await import('/simson/www/'+source);
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const client=new MinimalSIPUA({uri:'sip:test@example.invalid',iceServers:[],captureMedia:async()=>stream});
    client._registered=true;client._send=()=>{};
    await client.dial('mock-conference');
    const sdp=client._pc.localDescription.sdp;
    const video=sdp.slice(sdp.indexOf('m=video'));
    const media=sdp.split(/(?=m=)/).filter(section=>section.startsWith('m='));
    const attributes=media.map(section=>section.split('\r\n').filter(line=>line.startsWith('a=')).length);
    const unsupported=/a=rtpmap:\d+ (?:VP8|VP9|AV1|rtx)\//i.test(video);
    const unmapped=media.flatMap(section=>section.split('\r\n')[0].split(' ').slice(3)
      .filter(payload=>Number(payload)>=96 && !section.includes('a=rtpmap:'+payload+' ')));
    const result={video:video.includes('a=recvonly'),h264:video.includes('H264/90000'),localCamera:stream.getVideoTracks().length,attributes,unsupported,unmapped};
    client._cleanup();return result;
  });
  assert.equal(result.video,true);
  assert.equal(result.h264,true);
  assert.equal(result.localCamera,0);
  assert.equal(result.unsupported,false);
  assert.deepEqual(result.unmapped,[]);
  assert.ok(result.attributes.every(count=>count<=64),JSON.stringify(result.attributes));
  await page.close();
});

test('people and history remain searchable and bounded with large directories on mobile',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});await load(page);
  await page.evaluate(async()=>{
    const shell=document.querySelector('simson-relay-card');
    const host=shell._card.session;
    host._hass={...window.mockHass,callApi:async()=>({node_id:'office',users:Array.from({length:24},(_,index)=>({user_id:'user-'+index,user_name:'Person '+(index+1),entity_id:'',state:'ready'}))})};
    await host._loadPeople(true);
  });
  await page.getByRole('button',{name:'People · 24',exact:true}).waitFor();
  assert.equal(await page.locator('.compact-contacts .contact').count(),6);
  await page.getByRole('button',{name:'Next contacts page',exact:true}).click();
  await page.getByRole('button',{name:/Person 7/}).waitFor();
  await page.getByRole('textbox',{name:'Search contacts and devices'}).fill('Person 24');
  await page.getByRole('button',{name:/Person 24/}).waitFor();
  assert.equal(await page.locator('.compact-contacts .contact').count(),1);
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/compact-directory-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:/Person 24/}).click();
  await page.waitForFunction(()=>window.calls.some(call=>call.service==='call_user'));
  const call=await page.evaluate(()=>window.calls.find(call=>call.service==='call_user').data);
  assert.equal(call.target_user_id,'user-23');
  assert.equal(call.node_id,'office');
  await page.evaluate(()=>{
    const shell=document.querySelector('simson-relay-card');
    const host=shell._card.session;
    host._clearLocalCallState();
    host._history=Array.from({length:50},(_,index)=>({call_id:'history-'+index,remote_label:'Person '+(index+1),state:index%2?'ended':'missed',direction:'incoming'}));
    host._historyLoaded=true;
    shell.setConfig({node_id:'office',view:'history'});
  });
  await page.getByRole('textbox',{name:'Search call history'}).waitFor();
  assert.equal(await page.locator('.history-row').count(),6);
  await page.getByRole('combobox',{name:'Filter call history'}).selectOption('missed');
  await page.getByRole('textbox',{name:'Search call history'}).fill('Person 49');
  await page.getByText('Person 49',{exact:true}).waitFor();
  assert.equal(await page.locator('.history-row').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.close();
});

test('linked door video receives decoded frames without microphone capture and stops on hangup',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    window.videoRequests=[];
    window.fixtureCanvas=document.createElement('canvas');
    window.fixtureCanvas.width=320;window.fixtureCanvas.height=180;
    const ctx=window.fixtureCanvas.getContext('2d');
    let frame=0;window.draw=setInterval(()=>{ctx.fillStyle=++frame%2?'#00bb88':'#245599';ctx.fillRect(0,0,320,180);},100);
    window.fixtureStream=window.fixtureCanvas.captureStream(10);
    window.getMic=navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia=()=>{throw Error('RTSP viewing must not capture the microphone');};
    const stream=document.createElement('simson-door-stream');
    stream.nodeId='office';stream.extension='1604';stream.callId='owned-call';
    stream.hass={callApi:async(method,path,body)=>{
      window.videoRequests.push({method,path,call:body.call_id,audio:body.sdp.includes('m=audio')});
      const peer=window.videoSource=new RTCPeerConnection({iceServers:[]});
      await peer.setRemoteDescription({type:'offer',sdp:body.sdp});
      peer.addTrack(window.fixtureStream.getVideoTracks()[0],window.fixtureStream);
      await peer.setLocalDescription(await peer.createAnswer());
      if(peer.iceGatheringState!=='complete')await new Promise(resolve=>peer.addEventListener('icegatheringstatechange',()=>{if(peer.iceGatheringState==='complete')resolve();}));
      return {type:'answer',sdp:peer.localDescription.sdp};
    }};
    window.doorStream=stream;document.querySelector('#mount').append(stream);
  });
  assert.equal(await page.evaluate(()=>window.videoRequests.length),0);
  await page.evaluate(()=>{window.doorStream.active=true;});
  await page.waitForFunction(()=>window.doorStream.status==='live'&&window.doorStream.querySelector('video').videoWidth>0,null,{timeout:20000});
  assert.deepEqual(await page.evaluate(()=>window.videoRequests),[{method:'POST',path:'simson/video/offer',call:'owned-call',audio:false}]);
  await page.evaluate(()=>{window.doorPeer=window.doorStream._peer;window.doorStream.active=false;});
  await page.waitForFunction(()=>window.doorPeer.connectionState==='closed'&&window.doorStream.querySelector('video').srcObject===null);
  await page.evaluate(()=>{window.videoSource.close();window.fixtureStream.getTracks().forEach(track=>track.stop());clearInterval(window.draw);navigator.mediaDevices.getUserMedia=window.getMic;});
  await page.close();
});

test('door camera retains its native HA card through camera mode changes',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(()=>{
    window.loadCardHelpers=async()=>({createCardElement:config=>{
      const camera=document.createElement('div');camera.textContent='Camera preview';camera.dataset.mode=config.camera_view;return camera;
    }});
    const card=document.createElement('simson-door-phone-card');
    card.setConfig({node_id:'office',extension:'1603',camera_entity:'camera.door'});
    card.hass={...window.mockHass,states:{...window.mockHass.states,'camera.door':{state:'idle',attributes:{}}}};
    document.querySelector('#mount').replaceChildren(card);
  });
  await page.locator('simson-door-camera [data-mode="auto"]').waitFor();
  await page.getByRole('button',{name:'View live video',exact:true}).click();
  await page.locator('simson-door-camera [data-mode="live"]').waitFor();
  await page.getByRole('button',{name:'Stop video',exact:true}).click();
  await page.locator('simson-door-camera [data-mode="auto"]').waitFor();
  await page.close();
});

test('automation panels use the available width instead of a hidden grid column',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(origin+'/addon/');
  await page.locator('[data-page="automation"]').first().click();
  await page.getByRole('button',{name:'Door camera flow',exact:true}).click();
  const dimensions=await page.evaluate(()=>{
    const panels=document.querySelector('.automation-panels');
    const visible=[...panels.children].find(panel=>!panel.hidden);
    return {available:panels.getBoundingClientRect().width,actual:visible.getBoundingClientRect().width};
  });
  assert.ok(dimensions.actual>dimensions.available*0.95);
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/automation-flow-desktop.png'),fullPage:true});
  await page.close();
});

for (const sameNode of [false,true]) test(`${sameNode ? 'two users on one node' : 'two browser nodes'} exchange audio and video and release devices after hangup`,async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(async(sameNode)=>{
    const first=document.querySelector('simson-relay-card')._card.session;
    const second=document.createElement('simson-call-session');second.setConfig({node_id:sameNode?'office':'studio'});document.body.append(second);
    window.peers=[first,second];window.signalErrors=[];
    for(const [index,peer] of window.peers.entries()) {
      peer._render=()=>{};
      peer._hass={...window.mockHass,user:{id:`user${index+1}`}};
      peer._videoEnabled=true;peer._isCaller=index===0;peer._polite=index!==0;
      peer._answeredByMe=index!==0;
      peer._initiatedHere=index===0;
      peer._incomingCallType='video';
      peer._currentCallId='test-video';peer._currentRemoteNode=index===0&&!sameNode?'studio':'office';
      peer._fetchWebRTCConfig=async()=>({ice_servers:[]});
      peer._sendWebRTCSignal=(signal_type,data)=>{
        const remote=window.peers[1-index];
        const signal={call_id:'test-video',signal_type,data:{...data,simson_sender_user_id:peer._hass.user.id}};
        peer._handleWebRTCSignal(signal).catch(error=>window.signalErrors.push(error.message));
        remote._handleWebRTCSignal(signal).catch(error=>window.signalErrors.push(error.message));
      };
    }
    await second._startWebRTC();await first._startWebRTC();
  },sameNode);
  await page.waitForFunction(()=>window.peers.every(peer=>peer._pc?.connectionState==='connected' && peer._remoteStream?.getVideoTracks().length),{timeout:15000});
  const result=await page.evaluate(()=>{
    const tracks=window.peers.flatMap(peer=>peer._localStream.getTracks());
    const kinds=window.peers.map(peer=>peer._remoteStream.getTracks().map(track=>track.kind).sort());
    window.peers.forEach(peer=>peer._cleanupWebRTC());
    return{kinds,ended:tracks.every(track=>track.readyState==='ended'),errors:window.signalErrors};
  });
  assert.deepEqual(result,{kinds:[['audio','video'],['audio','video']],ended:true,errors:[]});
  await page.close();
});

async function loadRoomWorkspace(page, count=0) {
  await load(page);
  await page.evaluate(count=>{
    window.roomRPC=[];window.roomActions=[];
    window.roomData={nodes:[{node_id:'office',label:'Care site',connected:true,rooms:[]}],
      users:[{user_id:'room',label:'Room TV login'},{user_id:'caregiver',label:'Caregiver phone'}]};
    for(let index=0;index<count;index++)window.roomData.nodes[0].rooms.push({room_id:'room-'+index,label:'Room '+String(index).padStart(3,'0'),
      revision:1,room_user_id:'room',caregiver_user_id:'caregiver',audio_mode:'browser',video_mode:'none',
      setup_timeout_sec:60,max_duration_sec:3600});
    window.roomHass={...window.mockHass,user:{id:'admin',is_admin:true},states:{...window.mockHass.states,
      'camera.room':{entity_id:'camera.room',state:'idle',attributes:{friendly_name:'Room camera'}},
      'media_player.room_tv':{entity_id:'media_player.room_tv',state:'on',attributes:{friendly_name:'Room television'}},
      'input_boolean.panic':{entity_id:'input_boolean.panic',state:'off',attributes:{friendly_name:'Panic trigger'}}},
      callWS:async request=>{
        window.roomRPC.push(request);
        if(request.service==='get_room_configuration')return {response:structuredClone(window.roomData)};
        if(request.service==='configure_room'){
          const data=request.service_data;const rooms=window.roomData.nodes[0].rooms;
          const index=rooms.findIndex(room=>room.room_id===data.room_id);
          if(window.roomConflict)throw Error('This room was changed in another window. Reload it before saving.');
          if(data.remove){rooms.splice(index,1);return {response:{room_id:data.room_id}};}
          const profile={...data,revision:(index>=0?rooms[index].revision:0)+1};
          if(index>=0)rooms[index]=profile;else rooms.push(profile);
          return {response:{room_id:data.room_id}};
        }
        if(['start_room_call','end_room_call'].includes(request.service)){
          const data=request.service_data;window.roomActions.push({domain:'simson',service:request.service,data});
          const room=window.roomData.nodes[0].rooms.find(room=>room.room_id===data.room_id);
          room.session=request.service==='start_room_call'?{state:'ringing',session_id:'only-this-session'}:{state:'ended',session_id:'only-this-session'};
          return {response:room.session};
        }
      },callService:async(domain,service,data)=>{
        if(!['start_room_call','end_room_call'].includes(service))return;
        window.roomActions.push({domain,service,data});
        const room=window.roomData.nodes[0].rooms.find(room=>room.room_id===data.room_id);
        room.session=service==='start_room_call'?{state:'ringing',session_id:'only-this-session'}:{state:'ended',session_id:'only-this-session'};
      }};
    const panel=document.createElement('simson-call-panel');panel.hass=window.roomHass;
    document.getElementById('mount').style.maxWidth='none';
    document.getElementById('mount').replaceChildren(panel);
  },count);
  await page.getByRole('button',{name:'Room setup',exact:true}).click();
  await page.getByRole('heading',{name:'Room workspace'}).waitFor();
  await page.getByRole('button',{name:'Add room',exact:true}).waitFor({state:'visible'});
}

test('room setup saves native SIP audio with HA camera without requiring a room browser or scripts',async()=>{
  const page=await browser.newPage();await loadRoomWorkspace(page);
  await page.evaluate(()=>{
    window.roomData.capabilities={ha_camera:true,cast_display:true,native_sip_room_profiles:true};
    window.roomData.nodes[0].native_sip_rooms=true;
  });
  await page.getByRole('button',{name:'Refresh devices',exact:true}).click();
  await page.getByRole('button',{name:'Add room',exact:true}).click();
  await page.locator('input[name=label]').fill('SIP room');
  await page.locator('select[name=room_user_id]').selectOption('room');
  await page.locator('select[name=caregiver_user_id]').selectOption('caregiver');
  await page.locator('select[name=video_mode]').selectOption('ha_camera');
  await page.locator('input[name=camera_entity]').fill('camera.room');
  await page.locator('select[name=audio_mode]').selectOption('sip');
  assert.equal(await page.locator('select[name=video_mode]').inputValue(),'ha_camera');
  await page.locator('input[name=sip_extension]').fill('1040');
  await page.locator('select[name=sip_auto_mode]').selectOption('speaker');
  await page.getByRole('button',{name:'Save room',exact:true}).click();
  await page.getByText('Room saved. Its entities and enabled trigger are updated automatically.').waitFor();
  const saved=await page.evaluate(()=>window.roomRPC.find(request=>request.service==='configure_room').service_data);
  assert.equal(saved.sip_extension,'1040');assert.equal(saved.sip_auto_mode,'speaker');
  assert.equal(saved.video_mode,'ha_camera');assert.equal(saved.start_script,'');
  assert.equal(saved.stop_script,'');assert.equal(await page.evaluate(()=>window.roomActions.length),0);
  assert.equal(await page.locator('simson-room-source-runtime').count(),0);
  await page.close();
});

test('a staged frontend refuses native camera settings on an older backend without side effects',async()=>{
  const page=await browser.newPage();await loadRoomWorkspace(page);
  await page.getByRole('button',{name:'Add room',exact:true}).click();
  await page.locator('input[name=label]').fill('Room camera');
  await page.locator('select[name=room_user_id]').selectOption('room');
  await page.locator('select[name=caregiver_user_id]').selectOption('caregiver');
  await page.locator('select[name=video_mode]').selectOption('ha_camera');
  await page.locator('input[name=camera_entity]').fill('camera.room');
  await page.getByRole('button',{name:'Save room',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'has not loaded'}).waitFor();
  assert.equal(await page.evaluate(()=>window.roomRPC.filter(request=>request.service==='configure_room').length),0);
  assert.equal(await page.evaluate(()=>window.roomActions.length),0);
  await page.close();
});

test('room workspace creates, edits, duplicates and deletes room bindings without YAML or test calls',async()=>{
  const page=await browser.newPage({viewport:{width:1240,height:1024}});await loadRoomWorkspace(page);
  await page.getByRole('button',{name:'Add room',exact:true}).click();
  await page.locator('input[name=label]').fill('Room 101');
  await page.locator('select[name=room_user_id]').selectOption('room');
  await page.locator('select[name=caregiver_user_id]').selectOption('caregiver');
  await page.locator('input[name=trigger_entity]').fill('input_boolean.panic');
  await page.locator('input[name=trigger_enabled]').check();
  await page.getByRole('button',{name:'Save room',exact:true}).click();
  await page.getByText('Room saved. Its entities and enabled trigger are updated automatically.').waitFor();
  const first=await page.evaluate(()=>window.roomRPC.find(request=>request.service==='configure_room').service_data);
  assert.equal(first.room_id,'room-101');assert.equal(first.expected_revision,0);
  assert.equal(first.trigger_entity,'input_boolean.panic');assert.equal(first.trigger_enabled,true);
  assert.equal(await page.locator('select[name=room_user_id]').inputValue(),'room');
  assert.equal(await page.locator('select[name=caregiver_user_id]').inputValue(),'caregiver');
  assert.equal(await page.evaluate(()=>window.roomActions.length),0);
  await page.locator('input[name=label]').fill('East wing room');
  await page.getByRole('button',{name:'Save room',exact:true}).click();
  await page.waitForFunction(()=>window.roomData.nodes[0].rooms[0].revision===2);
  await page.getByRole('button',{name:'Call caregiver',exact:true}).click();
  await page.getByText('This room has an open session. End it before changing its bindings.').waitFor();
  assert.equal(await page.getByRole('button',{name:'Save room',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'End session / retry cleanup',exact:true}).click();
  await page.getByRole('button',{name:'Call caregiver',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.roomActions[1].data.session_id),'only-this-session');
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/room-workspace-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Duplicate setup',exact:true}).click();
  assert.equal(await page.locator('input[name=label]').inputValue(),'');
  assert.equal(await page.locator('select[name=room_user_id]').inputValue(),'');
  assert.equal(await page.locator('input[name=trigger_enabled]').isChecked(),false);
  await page.getByRole('button',{name:/East wing room/}).click();
  await page.getByRole('button',{name:'Remove room',exact:true}).click();
  await page.getByRole('button',{name:'Confirm removal',exact:true}).click();
  await page.getByText('Room removed. Its trigger is no longer active.').waitFor();
  assert.equal(await page.evaluate(()=>window.roomData.nodes[0].rooms.length),0);
  await page.close();
});

test('room workspace paginates on mobile, preserves conflicting drafts and denies non-admin setup',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});await loadRoomWorkspace(page,18);
  const settings=page.locator('simson-room-settings');
  assert.equal(await settings.locator('button.room').count(),8);
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:/Room 008/}).waitFor();
  await page.getByRole('searchbox',{name:'Find a room'}).fill('017');
  assert.equal(await settings.locator('button.room').count(),1);
  await page.getByRole('button',{name:/Room 017/}).click();
  await page.locator('input[name=label]').fill('Unsaved room name');
  await page.evaluate(()=>window.roomConflict=true);
  await page.getByRole('button',{name:'Save room',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'another window'}).waitFor();
  assert.equal(await page.locator('input[name=label]').inputValue(),'Unsaved room name');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/room-workspace-mobile.png'),fullPage:true});
  await page.evaluate(()=>{
    const panel=document.querySelector('simson-call-panel');panel.hass={...window.roomHass,user:{id:'observer',is_admin:false}};
  });
  assert.equal(await page.getByRole('button',{name:'Room setup',exact:true}).isVisible(),false);
  await page.close();
});

test('room controller stays compact on mobile, escapes names and scopes cleanup to the exact session',async()=>{
  const page=await browser.newPage({viewport:{width:360,height:740}});
  await load(page);
  await page.evaluate(()=>{
    const card=document.createElement('simson-room-card');
    card.setConfig({entity:'sensor.room'});
    window.roomCalls=[];
    window.roomHass={states:{'sensor.room':{state:'idle',attributes:{simson_room:true,node_id:'office',room_id:'101',
      friendly_name:'<img src=x onerror=alert(1)>',audio_mode:'sip',video_mode:'adapter'}}},
      callService:async(...args)=>window.roomCalls.push(args)};
    card.hass=window.roomHass;document.getElementById('mount').replaceChildren(card);
  });
  const card=page.locator('simson-room-card');
  assert.equal(await card.locator('img').count(),0);
  await card.getByRole('button',{name:'Call caregiver'}).click();
  assert.equal(await page.evaluate(()=>window.roomCalls[0][1]),'start_room_call');
  assert.equal(await page.evaluate(()=>window.roomCalls[0][2].room_id),'101');
  await page.evaluate(()=>{
    window.roomHass.states['sensor.room']={state:'attention',attributes:{...window.roomHass.states['sensor.room'].attributes,
      friendly_name:'Room 101',
      session_id:'exact-session',call_id:'exact-call',components:{audio:'ready',video:'failed',display:'pending'},
      reason:'Camera unavailable; audio remains connected'}};
    document.querySelector('simson-room-card').hass={...window.roomHass};
  });
  await card.getByRole('button',{name:'Retry cleanup'}).click();
  assert.deepEqual(await page.evaluate(()=>window.roomCalls[1]),['simson','end_room_call',
    {node_id:'office',room_id:'101',session_id:'exact-session'}]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(integrationRoot,'frontend/test-results/room-mobile.png')});
  await page.close();
});

test('an active sensor advances a room call when its status event was missed',async()=>{
  const page=await browser.newPage();await load(page);
  const result=await page.evaluate(async()=>{
    const call=document.querySelector('simson-relay-card')._card.session;
    let starts=0;call._startWebRTC=async()=>{starts++;};
    call._onHAUserCallStarted({node_id:'office',call_id:'room-live',caller_user_id:'user1',target_user_id:'user2',target_user_name:'Caregiver',call_type:'video',interactive:true});
    await call._joinUserCall();
    const active={call_id:'room-live',state:'active',direction:'outgoing',caller_user_id:'user1',target_user_id:'user2',local_user_call:true,call_type:'video',remote_node_id:'office'};
    call.hass={...window.mockHass,states:{...window.mockHass.states,
      'sensor.simson_office_call_state':{state:'active',attributes:active},
      'sensor.simson_office_calls_count':{state:'1',attributes:{active_calls:[active]}}}};
    await call.updateComplete;
    return {starts,state:call._callState(),initiatedHere:call._initiatedHere};
  });
  assert.equal(result.state,'active');assert.equal(result.initiatedHere,true);assert.equal(result.starts,1);
  await page.close();
});

test('fresh empty call sensors release a stale event snapshot without trusting older empty data',async()=>{
  const page=await browser.newPage();await load(page);
  const result=await page.evaluate(async()=>{
    const call=document.querySelector('simson-relay-card')._card.session;
    call._eventCallSnapshot={call_id:'ended-room',state:'active',direction:'outgoing',caller_user_id:'user1',_receivedAt:Date.now()-10000};
    call._currentCallId='ended-room';
    const states={...window.mockHass.states,'sensor.simson_office_calls_count':{state:'0',last_updated:new Date(Date.now()-20000).toISOString(),attributes:{active_calls:[]}}};
    call._hass={...window.mockHass,states};
    const before=call._callState();
    states['sensor.simson_office_calls_count']={...states['sensor.simson_office_calls_count'],last_updated:new Date().toISOString()};
    return {before,after:call._callState()};
  });
  assert.equal(result.before,'active');assert.equal(result.after,'idle');await page.close();
});

test('native SIP room decodes independent room and caregiver videos with no room browser sender',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(async()=>{
    const {SipRoomMedia}=await import('/test-src/transport/sip-room-media.js');
    const context={node_id:'office',room_id:'101',call_id:'sip-room-call',session_id:'sip-room-session',
      media_role:'sip_caregiver',camera_entity:'camera.room',display_entity:'media_player.tv',display_mode:'cast'};
    window.mediaRequests=[];window.cameraRequests=[];
    const hass={callWS:async request=>{
      const data=request.service_data;window.mediaRequests.push(request);
      if(request.service==='get_room_media')return {response:context};
      if(request.service==='report_room_component')return {response:{}};
      if(data.operation==='viewer_poll'){window.displayViewer=data.client_id;return {response:window.displayOffer||{}};}
      if(data.operation==='publisher_poll')return {response:{viewers:window.displayViewer?[{viewer_id:window.displayViewer,answer:window.displayAnswer||'',generation:'native-one'}]:[]}};
      if(data.operation==='offer'){window.displayOffer={offer:data.sdp,generation:'native-one'};return {response:{generation:'native-one'}};}
      if(data.operation==='answer'){window.displayAnswer=data.sdp;return {response:{}};}
      return {response:{}};
    }};
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=200;
    const draw=()=>{const brush=canvas.getContext('2d');brush.fillStyle=`hsl(${Date.now()%360},80%,50%)`;brush.fillRect(0,0,400,200);};
    draw();window.roomDraw=setInterval(draw,40);window.roomCamera=canvas.captureStream(25);
    const remote=document.createElement('video');remote.id='native-room-camera';remote.muted=true;remote.autoplay=true;document.body.append(remote);
    const audio={sipAudio:true};
    const host=window.nativeHost={_currentCallId:context.call_id,_answeredByMe:true,isConnected:true,_hass:hass,
      _remoteAudio:{srcObject:audio},_render(){},_mediaConstraints:()=>({video:true}),
      _attachMediaElements(){remote.srcObject=this._remoteStream;remote.play();}};
    const screen=document.createElement('simson-room-display-card');screen.setConfig({node_id:'office',room_id:'101'});screen.hass=hass;
    document.getElementById('mount').replaceChildren(screen);window.nativeScreen=screen;
    const media=window.nativeMedia=new SipRoomMedia(host,context,[],{
      openCamera:async()=>({stream:window.roomCamera,close(){window.roomCamera.getTracks().forEach(track=>track.stop());}}),
      captureCamera:async constraints=>{window.cameraRequests.push(constraints);return navigator.mediaDevices.getUserMedia(constraints);},
    });
    await media.openVideo();await media.enableCamera();window.expectedAudio=audio;
  });
  await page.waitForFunction(()=>document.querySelector('#native-room-camera').videoWidth===400);
  await page.waitForFunction(()=>window.nativeScreen._display?.shadowRoot.querySelector('video')?.videoWidth>0,null,{timeout:20000});
  const result=await page.evaluate(()=>{
    const peer=[...window.nativeMedia.publisher.peers.values()][0].peer;
    const result={audioUnchanged:window.nativeHost._remoteAudio.srcObject===window.expectedAudio,
      captures:window.cameraRequests,descriptions:window.mediaRequests.filter(message=>message.service_data?.sdp).map(message=>message.service_data.sdp),
      camera:window.nativeMedia.local.getVideoTracks()[0],room:window.roomCamera.getVideoTracks()[0]};
    window.nativeMedia.close();window.nativeScreen.remove();clearInterval(window.roomDraw);
    return {...result,camera:result.camera.readyState,room:result.room.readyState,peer:peer.connectionState};
  });
  assert.equal(result.audioUnchanged,true);assert.equal(result.captures.length,1);assert.equal(result.captures[0].audio,false);
  assert.equal(result.descriptions.length,2);assert.ok(result.descriptions.every(sdp=>!/^m=audio /m.test(sdp)));
  assert.equal(result.camera,'ended');assert.equal(result.room,'ended');assert.equal(result.peer,'closed');
  await page.close();
});

test('room Cast screen decodes caregiver video without audio and releases its relay',async()=>{
  const page=await browser.newPage();await load(page);
  const source=await readFile(path.join(integrationRoot,'frontend/src/transport/room-display-relay.js'),'utf8');
  await page.addScriptTag({type:'module',content:source+'\nwindow.RoomDisplayPublisher=RoomDisplayPublisher;'});
  await page.waitForFunction(()=>Boolean(window.RoomDisplayPublisher));
  await page.evaluate(()=>{
    const context={node_id:'office',room_id:'101',call_id:'room-call',session_id:'room-session',ice_servers:[]};
    window.screenMessages=[];window.displayViewer=null;window.displayOffer=null;window.displayAnswer=null;
    const hass={callWS:async request=>{
      if(request.service==='get_room_media')return {response:context};
      const data=request.service_data;window.screenMessages.push(data);
      if(request.service==='report_room_component')return {response:{}};
      if(data.operation==='viewer_poll'){window.displayViewer=data.client_id;return {response:window.displayOffer||{}};}
      if(data.operation==='publisher_poll')return {response:{viewers:window.displayViewer?[{viewer_id:window.displayViewer,answer:window.displayAnswer||'',generation:'offer-one'}]:[]}};
      if(data.operation==='offer'){window.displayOffer={offer:data.sdp,generation:'offer-one'};return {response:{generation:'offer-one'}};}
      if(data.operation==='answer'){window.displayAnswer=data.sdp;return {response:{}};}
      return {response:{}};
    }};
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
    const draw=()=>{const context=canvas.getContext('2d');context.fillStyle=`hsl(${Date.now()%360},80%,50%)`;context.fillRect(0,0,320,180);};
    draw();window.screenDraw=setInterval(draw,40);window.caregiverVideo=canvas.captureStream(25);
    const screen=document.createElement('simson-room-display-card');screen.setConfig({node_id:'office',room_id:'101'});screen.hass=hass;
    document.getElementById('mount').replaceChildren(screen);window.screen=screen;
    window.publisher=new window.RoomDisplayPublisher(hass,context,window.caregiverVideo,[]);
  });
  await page.waitForFunction(()=>document.querySelector('simson-room-display-card')?._display?.shadowRoot?.querySelector('video')?.videoWidth===320,null,{timeout:20000});
  await page.waitForFunction(()=>window.screenMessages.some(message=>message.operation==='viewer_ready'));
  const result=await page.evaluate(()=>{
    const descriptions=window.screenMessages.filter(message=>message.sdp).map(message=>message.sdp);
    window.publisher.close();window.screen.remove();clearInterval(window.screenDraw);
    return {descriptions,sourceTrack:window.caregiverVideo.getVideoTracks()[0].readyState,peers:window.publisher.peers.size};
  });
  assert.equal(result.descriptions.length,2);assert.ok(result.descriptions.every(sdp=>/^m=video /m.test(sdp)&&!/^m=audio /m.test(sdp)));
  assert.equal(result.sourceTrack,'live');assert.equal(result.peers,0);
  await page.close();
});

test('both users can add cameras during an established voice call without losing audio',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(async()=>{
    const first=document.querySelector('simson-relay-card')._card.session;
    const second=document.createElement('simson-call-session');second.setConfig({node_id:'studio'});document.body.append(second);
    window.peers=[first,second];window.signalErrors=[];
    for(const [index,peer] of window.peers.entries()) {
      peer._render=()=>{};peer._hass={...window.mockHass,user:{id:`user${index+1}`}};
      peer._isCaller=index===0;peer._polite=index!==0;peer._answeredByMe=index!==0;peer._initiatedHere=index===0;
      peer._currentCallType='voice';peer._currentCallId='upgrade';peer._currentRemoteNode=index===0?'studio':'office';
      peer._fetchWebRTCConfig=async()=>({ice_servers:[]});
      peer._sendWebRTCSignal=(signal_type,data)=>window.peers[1-index]._handleWebRTCSignal({call_id:'upgrade',signal_type,data})
        .catch(error=>window.signalErrors.push(error.message));
    }
    await second._startWebRTC();await first._startWebRTC();
  });
  await page.waitForFunction(()=>window.peers.every(peer=>peer._pc?.connectionState==='connected'));
  await page.evaluate(()=>Promise.all(window.peers.map(peer=>peer._enableCamera())));
  await page.evaluate(()=>{window.mediaCheck=setInterval(async()=>{
    for(const peer of window.peers) {
      const stats=await peer._pc.getStats();
      if(![...stats.values()].some(stat=>stat.type==='inbound-rtp'&&stat.kind==='video'&&stat.framesDecoded>0))return;
      if(![...stats.values()].some(stat=>stat.type==='inbound-rtp'&&stat.kind==='audio'&&stat.packetsReceived>0))return;
    }
    window.bothMediaReady=true;clearInterval(window.mediaCheck);
  },100);});
  await page.waitForFunction(()=>window.bothMediaReady,null,{timeout:15000});
  assert.deepEqual(await page.evaluate(()=>window.signalErrors),[]);
  await page.evaluate(()=>window.peers.forEach(peer=>peer._cleanupWebRTC()));
  await page.close();
});
