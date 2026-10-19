import { html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { pageItems, pager } from './directory.js';

export function historyView(host) {
  const query = String(host._historySearch || '').toLowerCase().trim();
  const filtered = host._history.filter(call=>(!host._historyFilter || host._historyFilter==='all' ||
    (host._historyFilter==='missed' && ['missed','failed','declined','timeout'].includes(call.state)) || call.direction===host._historyFilter) &&
    [call.remote_label,call.remote_node_id,call.state].some(value=>String(value || '').toLowerCase().includes(query)));
  const page = pageItems(filtered,host._historyPage);
  const update = value=>{host._historyPage=value;host.requestUpdate();};
  return html`<section class="history-workspace"><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${()=>host._loadHistory()}>Refresh</button></div>
    <div class="directory-toolbar"><input aria-label="Search call history" placeholder="Search calls" .value=${host._historySearch || ''} @input=${event=>{host._historySearch=event.target.value;update(0);}}>
      <select aria-label="Filter call history" .value=${host._historyFilter || 'all'} @change=${event=>{host._historyFilter=event.target.value;update(0);}}>${[['all','All calls'],['incoming','Incoming'],['outgoing','Outgoing'],['missed','Missed & failed']].map(([value,label])=>html`<option value=${value}>${label}</option>`)}</select></div>
    ${!page.total?html`<div class="empty compact">${host._historyLoaded?'No calls match this view.':'Loading recent calls…'}</div>`:html`<div class="history">${repeat(page.items,(call,index)=>call.call_id || index,call=>html`<div class="history-row"><span class="avatar ${['missed','failed','declined'].includes(call.state)?'missed':''}">${call.direction==='incoming'?'↙':'↗'}</span><div class="contact-text"><b>${call.remote_label || call.remote_node_id || 'Unknown caller'}</b><small>${call.state} · ${host._formatDuration(call.duration || 0)}</small></div><button class="text-button" aria-label="Call back" @click=${()=>{host._nodeInputDraft=String(call.remote_node_id || '').replace(/^(sip:|phone:)/,'');host._selectTab('dial');}}>Call ↗</button></div>`)}</div>`}
    ${pager(page,'history page',update)}</section>`;
}
