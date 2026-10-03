import { html, nothing } from 'lit';

export function userView(card, host, view, callView) {
  const entity = card._config.entity;
  const user = host._hass?.states?.[entity];
  if (!user?.attributes?.simson_contact || user.attributes.simson_call_button) return html`<div class="empty"><h2>Choose a user</h2><p>Select a Simson user contact sensor in the card editor.</p></div>`;
  const name = user.attributes.user_name || user.attributes.friendly_name || 'User';
  const ownContact = user.attributes.user_id === host._hass?.user?.id;
  const ready = user.state === 'ready';
  const notification = user.attributes.notification;
  return html`<section class="user-workspace">
    ${view.hasCall ? callView(host, view) : html`<div class="user-profile"><span class="call-avatar">${name.slice(0,2).toUpperCase()}</span><h2>${name}</h2><span class="user-presence ${ready ? 'ready' : ''}">${ownContact ? 'This is you' : ready ? 'Ready to receive a call' : user.state === 'unavailable' ? 'Unavailable' : 'In a call'}</span></div>
      <p class="fine-print">Calls are private to you and the recipient. They can answer from their dashboard or configured phone notification.</p>
      <div class="user-actions"><button class="primary" ?disabled=${ownContact || !ready || !view.connected || Boolean(host._actionPending)} @click=${()=>host._runAction('user:'+entity,()=>host._callUserEntity(entity))}>Call ${name}</button>
        <label class="toggle"><span>Start with video</span><input type="checkbox" .checked=${host._videoEnabled} @change=${event=>{host._videoEnabled=event.target.checked;host._saveMediaPreferences();host.requestUpdate();}}></label></div>`}
    ${notification?.status === 'failed' || notification?.status === 'clear_failed' ? html`<div class="notice error" role="status">Phone notification could not be ${notification.status === 'failed' ? 'sent' : 'cleared'}. Dashboard calling remains available; ask the administrator to check the Companion app mapping.</div>` : nothing}
  </section>`;
}
