import { html, nothing } from 'lit';
import { directoryView } from './directory.js';

export function dialView(host, view) {
  const route = host._smartDialRoute(host._nodeInputDraft);
  const targets = [...host._targets];
  for (const node of host._config.target_nodes || []) {
    if (!targets.some(target=>(target.node_id || target.id)===node)) targets.push({id:node,node_id:node,label:node,type:'node'});
  }
  const canDial = view.connected && !view.hasCall;
  const dial = ()=>canDial && host._runAction('dial',()=>host._dialSmartValue(host._nodeInputDraft,host._pstnTrunkDraft));
  return html`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>Call a person, a room, or an outside number.</p></div>
    <div class="route-options" aria-label="Call route">${[['auto','Auto'],['node','Node'],['sip','SIP phone'],['pstn','Outside']].map(([id,label])=>html`<button class=${host._smartRouteMode===id?'selected':''} aria-pressed=${host._smartRouteMode===id} @click=${()=>{host._smartRouteMode=id;host.requestUpdate();}}>${label}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${host._nodeInputDraft} placeholder="Enter extension, number or node" @input=${event=>{host._nodeInputDraft=event.target.value;host.requestUpdate();}} @keydown=${event=>{if(event.key==='Enter')dial();}}><button class="primary" aria-label="Place call" ?disabled=${!canDial || Boolean(host._actionPending) || !host._nodeInputDraft.trim()} @click=${dial}>Call ↗</button></div></label>
    <div class="route-hint"><span>${route.label}</span><small>${route.hint}</small></div>
    ${route.kind==='pstn'?html`<label class="field"><span>Gateway trunk</span><input .value=${host._pstnTrunkDraft || host._effectivePstnTrunk()} placeholder="Site default" @input=${event=>{host._pstnTrunkDraft=event.target.value;}}></label>`:nothing}
    ${directoryView(host,targets,canDial)}
    <details class="call-preferences"><summary>Call preferences · ${host._videoEnabled?'Camera enabled':'Audio first'}</summary>
      <label class="toggle node-video-toggle"><span><b>Share camera on user calls</b><small>Door-phone RTSP video is separate from your camera and SIP audio.</small></span><input type="checkbox" .checked=${host._videoEnabled} @change=${event=>{host._videoEnabled=event.target.checked;host._saveMediaPreferences();host.requestUpdate();if(host._videoEnabled)host._refreshMediaDevices(true);}}></label>
      ${host._videoEnabled && host._turnAvailable===false?html`<div class="notice" role="status">No TURN relay is configured. Mobile or restrictive networks may need a relay.</div>`:nothing}
      ${host._videoEnabled && !globalThis.isSecureContext?html`<div class="notice error">Camera and microphone access require HTTPS.</div>`:nothing}
      <button class="text-button" @click=${()=>host._selectTab('media')}>Camera, microphone & sound settings →</button>
    </details>
  </section>`;
}
