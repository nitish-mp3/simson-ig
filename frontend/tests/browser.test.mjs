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
    try { const data=await readFile(file);response.writeHead(200,{'content-type':file.endsWith('.css')?'text/css':'text/javascript'});response.end(data); }
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

test('two browser nodes exchange audio and video and release devices after hangup',async()=>{
  const page=await browser.newPage();await load(page);
  await page.evaluate(async()=>{
    const first=document.querySelector('simson-relay-card')._card.session;
    const second=document.createElement('simson-call-session');second.setConfig({node_id:'studio'});document.body.append(second);
    window.peers=[first,second];window.signalErrors=[];
    for(const [index,peer] of window.peers.entries()) {
      peer._render=()=>{};
      peer._videoEnabled=true;peer._isCaller=index===0;peer._polite=index!==0;
      peer._incomingCallType='video';
      peer._currentCallId='test-video';peer._currentRemoteNode=index===0?'studio':'office';
      peer._fetchWebRTCConfig=async()=>({ice_servers:[]});
      peer._sendWebRTCSignal=(signal_type,data)=>{
        const remote=window.peers[1-index];
        remote._handleWebRTCSignal({call_id:'test-video',signal_type,data}).catch(error=>window.signalErrors.push(error.message));
      };
    }
    await second._startWebRTC();await first._startWebRTC();
  });
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
