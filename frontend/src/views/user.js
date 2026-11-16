import { html, nothing } from 'lit';

export function userView(card, host, view, callView) {
  const entity = card._config.entity;
  const user = host._hass?.states?.[entity];
  if (!user?.attributes?.simson_contact || user.attributes.simson_call_button) return html`<div class="empty"><h2>Choose a user</h2><p>Select a Simson user contact sensor in the card editor.</p></div>`;
  const name = user.attributes.user_name || user.attributes.friendly_name || 'User';
  const ownContact = user.attributes.user_id === host._hass?.user?.id;
  const ready = user.state === 'ready';
  const notification = user.attributes.notification;
  const configuredTarget = user.attributes.notification_target;
  const notifyServices = Object.entries(host._hass?.services?.notify || {})
    .filter(([service]) => service.startsWith('mobile_app_'))
    .sort(([a], [b]) => a.localeCompare(b));
  host._notificationTargetDrafts ||= {};
  const draft = host._notificationTargetDrafts[entity];
  const selectedTarget = draft ?? (configuredTarget ? configuredTarget.service?.replace(/^notify\./, '') || '__disabled' : '__automatic');
  const saveTarget = () => {
    const value = host._notificationTargetDrafts[entity] ?? selectedTarget;
    const automatic = value === '__automatic';
    const notifyService = value === '__disabled' || automatic ? '' : `notify.${value}`;
    return host._runAction(`notification-target:${entity}`, () => host._callService('set_user_notification_target', {
      entity_id: entity,
      notify_service: notifyService,
      dashboard_path: configuredTarget?.dashboard_path || '/simson-call',
      automatic,
    }));
  };
  return html`<section class="user-workspace">
    ${view.hasCall ? callView(host, view) : html`<div class="user-profile"><span class="call-avatar">${name.slice(0,2).toUpperCase()}</span><h2>${name}</h2><span class="user-presence ${ready ? 'ready' : ''}">${ownContact ? 'This is you' : ready ? 'Ready to receive a call' : user.state === 'unavailable' ? 'Unavailable' : 'In a call'}</span></div>
      <p class="fine-print">Calls are private to you and the recipient. They can answer from their dashboard or configured phone notification.</p>
      <div class="user-actions"><button class="primary" ?disabled=${ownContact || !ready || !view.connected || Boolean(host._actionPending)} @click=${()=>host._runAction('user:'+entity,()=>host._callUserEntity(entity))}>Call ${name}</button>
        <label class="toggle"><span>Start with video</span><input type="checkbox" .checked=${host._videoEnabled} @change=${event=>{host._videoEnabled=event.target.checked;host._saveMediaPreferences();host.requestUpdate();}}></label></div>`}
    ${notification?.status === 'failed' || notification?.status === 'clear_failed' ? html`<div class="notice error" role="status">Phone notification could not be ${notification.status === 'failed' ? 'sent' : 'cleared'}. Dashboard calling remains available; ask the administrator to check the Companion app mapping.</div>` : nothing}
    ${host._hass?.user?.is_admin ? html`<section class="user-notification-settings" aria-labelledby="user-notification-title">
      <h3 id="user-notification-title">Call notification phone</h3>
      <p class="fine-print">Choose the Companion phone for ${name}. The device name is specific to this Home Assistant installation.</p>
      <label class="field"><span>Phone</span>
        <select id="user-notification-target" .value=${selectedTarget} @change=${event=>{host._notificationTargetDrafts[entity]=event.target.value;host.requestUpdate();}}>
          <option value="__automatic">Automatic: phones registered to this user</option>
          <option value="__disabled">Notifications disabled</option>
          ${notifyServices.map(([service, details])=>html`<option value=${service}>${details?.name || service.replace(/^mobile_app_/, '').replaceAll('_', ' ')}</option>`)}
        </select>
      </label>
      <button class="text-button" ?disabled=${Boolean(host._actionPending)} @click=${saveTarget}>Save phone mapping</button>
      <button class="text-button" ?disabled=${Boolean(host._actionPending)} @click=${()=>host._runAction(`test-notification:${entity}`,()=>host._callService('test_user_notification',{entity_id:entity}))}>Test phone notification</button>
      ${notifyServices.length ? nothing : html`<p class="fine-print" role="status">No named Companion phone services found. Register this phone in the Companion app.</p>`}
    </section>` : nothing}
  </section>`;
}
