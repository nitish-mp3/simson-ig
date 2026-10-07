import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';

const key=process.env.SIMSON_SSH_KEY;
if(!key)throw Error('SIMSON_SSH_KEY is required');
const host=process.env.SIMSON_PROBE_HOST || 'simson-vps.vipsy.in';
const python="import json,time,hmac,hashlib,base64;config=json.load(open('/opt/simson/turn-relay.pending.json'));name=str(int(time.time())+300)+':probe';password=base64.b64encode(hmac.new(config['turn_auth_secret'].encode(),name.encode(),hashlib.sha1).digest()).decode();print(json.dumps({'username':name,'credential':password,'urls':config['turn_urls']}))";
const config=JSON.parse(execFileSync('ssh',['-i',key,'-o','BatchMode=yes',`ubuntu@${host}`,`sudo python3 -c '${python.replaceAll("'","'\\''")}'`],{encoding:'utf8'}));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
try {
  const page=await browser.newPage();
  for(const url of config.urls) {
    const result=await page.evaluate(async config=>{
      const first=new RTCPeerConnection({iceTransportPolicy:'relay',iceServers:[config]});
      const second=new RTCPeerConnection({iceTransportPolicy:'relay',iceServers:[config]});
      const gather=peer=>new Promise((resolve,reject)=>{
        if(peer.iceGatheringState==='complete'){resolve();return;}
        const timer=setTimeout(()=>reject(Error('relay gathering timed out')),15000);
        peer.onicegatheringstatechange=()=>{if(peer.iceGatheringState==='complete'){clearTimeout(timer);resolve();}};
      });
      try {
        const channel=first.createDataChannel('relay-probe');
        const received=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('relay data timed out')),20000);
          second.ondatachannel=event=>{event.channel.onmessage=message=>{clearTimeout(timer);resolve(message.data==='Simson relay probe');};};
        });
        received.catch(()=>{});
        channel.onopen=()=>channel.send('Simson relay probe');
        await first.setLocalDescription(await first.createOffer());await gather(first);
        await second.setRemoteDescription(first.localDescription);
        await second.setLocalDescription(await second.createAnswer());await gather(second);
        await first.setRemoteDescription(second.localDescription);
        const delivered=await received;
        const stats=await first.getStats();
        const candidates=[...stats.values()].filter(value=>value.type==='local-candidate');
        return {delivered,relay:candidates.some(value=>value.candidateType==='relay')};
      }catch(error){return {delivered:false,error:error.message};}
      finally{first.close();second.close();}
    },{...config,urls:url});
    console.log(JSON.stringify({url,...result}));
    if(!result.delivered || !result.relay)process.exitCode=1;
  }
}finally{await browser.close();}
