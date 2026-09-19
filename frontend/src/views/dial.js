import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

export function dialView(host, view) {
  const route = host._smartDialRoute(host._nodeInputDraft);
  const targets = [...host._targets];
  for (const node of host._config.target_nodes || []) {
    if (!targets.some(target => (target.node_id || target.id) === node)) targets.push({id:node,node_id:node,label:node,type:'node'});
  }
  const canDial = view.connected && !view.hasCall;
  const dial = () => canDial && host._runAction('dial', () => host._dialSmartValue(host._nodeInputDraft, host._pstnTrunkDraft));
  return html`<section class="dial-workspace">
    <div class="intro"><span class="eyebrow">START A CONVERSATION</span><h2>Who’s on your mind?</h2><p>A teammate, a room, or a number. One place to call.</p></div>
    <div class="route-options" aria-label="Call route">${[['auto','Auto'],['node','Node'],['sip','SIP phone'],['pstn','Outside']].map(([id,label]) => html`<button class=${host._smartRouteMode === id ? 'selected' : ''} aria-pressed=${host._smartRouteMode === id} @click=${() => {host._smartRouteMode=id;host.requestUpdate();}}>${label}</button>`)}</div>
    <label class="field"><span>Number, extension or node</span><div class="dial-input"><input id="node-input" autocomplete="off" .value=${host._nodeInputDraft} placeholder="Search a node or dial a number" @input=${event => {host._nodeInputDraft=event.target.value;host.requestUpdate();}} @keydown=${event => {if(event.key==='Enter') dial();}}><button class="primary" aria-label="Place call" ?disabled=${!canDial || Boolean(host._actionPending) || !host._nodeInputDraft.trim()} @click=${dial}>Call ↗</button></div></label>
    <div class="route-hint"><span>${route.label}</span><small>${route.hint}</small></div>
    ${route.kind === 'pstn' ? html`<label class="field"><span>Gateway trunk</span><input .value=${host._pstnTrunkDraft || host._effectivePstnTrunk()} placeholder="Site default" @input=${event => {host._pstnTrunkDraft=event.target.value;}}></label>` : nothing}
    <div class="section-heading"><h3>Quick connections</h3><span>${targets.length} saved</span></div>
    ${!targets.length ? html`<div class="empty compact">${host._targetsLoading ? 'Loading your contacts…' : 'Saved nodes and phones appear here. You can always dial above.'}</div>` : html`<div class="contacts">${repeat(targets, target => target.id, target => html`<button class="contact" ?disabled=${!canDial || Boolean(host._actionPending)} @click=${() => {
      if ((target.type || 'node') === 'node') {
        host._userPickerNodeId=target.node_id || target.id; host._userPickerTargetId=target.id;
        host._callService('get_remote_users',{node_id:host._userPickerNodeId});
      } else host._runAction('target:'+target.id, () => host._dialTarget(target.id,target.type,target.node_id));
    }}><span class="avatar">${String(target.label || target.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${target.label || target.id}</b><small>${target.type === 'node' ? 'Home Assistant' : target.trunk ? 'Gateway · '+target.trunk : 'SIP · '+(target.extension || target.id)}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`}
    <button class="text-button" @click=${() => host._selectTab('media')}>${host._videoEnabled ? 'Camera enabled for node calls' : 'Audio calls'} · Check your devices →</button>
  </section>`;
}
