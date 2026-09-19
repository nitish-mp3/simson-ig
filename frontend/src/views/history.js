import { html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

export function historyView(host) {
  return html`<section><div class="section-heading"><h2>Recent calls</h2><button class="text-button" @click=${() => host._loadHistory()}>Refresh</button></div>${!host._history.length ? html`<div class="empty">${host._historyLoaded ? 'Your conversations will appear here.' : 'Loading recent calls…'}</div>` : html`<div class="history">${repeat(host._history.slice(0,50), (call,index) => call.call_id || index, call => html`<div class="history-row"><span class="avatar ${['missed','failed','declined'].includes(call.state) ? 'missed' : ''}">${call.direction === 'incoming' ? '↙' : '↗'}</span><div class="contact-text"><b>${call.remote_label || call.remote_node_id || 'Unknown caller'}</b><small>${call.state} · ${host._formatDuration(call.duration || 0)}</small></div><button class="text-button" aria-label="Call back" @click=${() => {host._nodeInputDraft=call.remote_node_id || '';host._selectTab('dial');}}>Call ↗</button></div>`)}</div>`}</section>`;
}
