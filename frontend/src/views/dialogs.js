import { html, nothing } from 'lit';
import { callView } from './call.js';

export function dialogsView(host) {
  if (!host._pickerOpen && !host._showPopup && !(host._showCallDialog && host._view?.hasCall)) return nothing;
  const picker = host._pickerOpen;
  const outgoing = !picker && !host._showPopup && host._showCallDialog;
  const callUser = user => {
    const node = host._userPickerNodeId;
    host._removeUserPicker();
    host._runAction('call-user', () => host._dial(node, user?.user_id, user?.user_name));
  };
  const keyboard = event => {
    if (event.key === 'Escape') {
      if (picker) host._removeUserPicker();
      else if (outgoing) {host._showCallDialog=false;host._render();}
    }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), summary')];
    const first = buttons[0], last = buttons.at(-1);
    const focused = event.currentTarget.getRootNode().activeElement;
    if (event.shiftKey && focused === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && focused === last) {event.preventDefault();first?.focus();}
  };
  const cancel = event => {event.preventDefault();if(picker)host._removeUserPicker();else if(outgoing){host._showCallDialog=false;host._render();}};
  if (outgoing) return html`<dialog class="dialog-scrim" aria-label="Your call" @cancel=${cancel}><section class="dialog call-dialog" @keydown=${keyboard}>
    <div class="dialog-heading"><span class="eyebrow">YOUR PRIVATE CALL</span><button class="text-button" @click=${()=>{host._showCallDialog=false;host._render();}}>Minimize</button></div>
    ${host._actionError ? html`<div class="notice error" role="alert">${host._actionError}</div>` : nothing}
    ${callView(host,host._view)}
  </section></dialog>`;
  return html`<dialog class="dialog-scrim" aria-label=${picker ? 'Choose call recipient' : 'Incoming call'} @cancel=${cancel}><section class="dialog" @keydown=${keyboard}>
    <span class="eyebrow">${picker ? 'CHOOSE A RECIPIENT' : 'INCOMING CALL'}</span>
    <h2>${picker ? host._userPickerNodeId : host._incomingFrom}</h2>
    ${picker ? html`<div class="dialog-options"><button class="primary" @click=${() => callUser(null)}>Call everyone on this node</button>${host._remoteUsers.map(user => html`<button @click=${() => callUser(user)}>${user.user_name || user.user_id}</button>`)}</div><button class="text-button" @click=${() => host._removeUserPicker()}>Cancel</button>` : html`<p>Would like to talk to you.</p>${host._actionError ? html`<div class="notice error" role="alert">${host._actionError}</div>` : nothing}<div class="call-actions"><button class="primary" ?disabled=${Boolean(host._actionPending)} @click=${() => host._runAction('answer', () => host._answer())}>Answer</button><button class="danger" ?disabled=${Boolean(host._actionPending)} @click=${() => host._runAction('reject', () => host._reject())}>Decline</button></div>`}
  </section></dialog>`;
}
