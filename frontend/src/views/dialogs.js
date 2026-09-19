import { html, nothing } from 'lit';

export function dialogsView(host) {
  if (!host._pickerOpen && !host._showPopup) return nothing;
  const picker = host._pickerOpen;
  const callUser = user => {
    const node = host._userPickerNodeId;
    host._removeUserPicker();
    host._runAction('call-user', () => host._dial(node, user?.user_id, user?.user_name));
  };
  return html`<div class="dialog-scrim"><section class="dialog" role="dialog" aria-modal="true" aria-label=${picker ? 'Choose call recipient' : 'Incoming call'} @keydown=${event => {if(event.key==='Escape' && picker)host._removeUserPicker();}}>
    <span class="eyebrow">${picker ? 'CHOOSE A RECIPIENT' : 'INCOMING CALL'}</span>
    <h2>${picker ? host._userPickerNodeId : host._incomingFrom}</h2>
    ${picker ? html`<div class="dialog-options"><button class="primary" @click=${() => callUser(null)}>Call everyone on this node</button>${host._remoteUsers.map(user => html`<button @click=${() => callUser(user)}>${user.user_name || user.user_id}</button>`)}</div><button class="text-button" @click=${() => host._removeUserPicker()}>Cancel</button>` : html`<p>Would like to talk to you.</p><div class="call-actions"><button class="primary" @click=${() => host._runAction('answer', () => host._answer())}>Answer</button><button class="danger" @click=${() => host._runAction('reject', () => host._reject())}>Decline</button></div>`}
  </section></div>`;
}
