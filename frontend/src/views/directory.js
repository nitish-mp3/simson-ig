import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

export function sitePeople(host) {
  const people = new Map();
  for (const [entity, state] of Object.entries(host._hass?.states || {})) {
    const attrs = state.attributes || {};
    if (attrs.simson_contact && !attrs.simson_call_button && attrs.node_id === host._nodeId() && state.state !== 'unavailable')
      people.set(attrs.user_id, {user_id:attrs.user_id,user_name:attrs.user_name || 'User',entity_id:entity,state:state.state});
  }
  for (const user of host._localUsers || []) {
    const current=people.get(user.user_id);
    people.set(user.user_id, {...current,...user,state:current?.state || user.state,entity_id:user.entity_id || current?.entity_id || ''});
  }
  return [...people.values()].filter(user=>user.user_id && user.user_id !== host._hass?.user?.id)
    .sort((first,second)=>first.user_name.localeCompare(second.user_name,undefined,{numeric:true,sensitivity:'base'}));
}

export function pageItems(items, page = 0, size = 6) {
  const pages = Math.max(1,Math.ceil(items.length/size));
  const current = Math.max(0,Math.min(page,pages-1));
  return {items:items.slice(current*size,(current+1)*size),current,pages,total:items.length};
}

export function pager(page, label, change) {
  return page.pages > 1 ? html`<nav class="list-pager" aria-label=${label}>
    <span aria-live="polite">${page.current+1} / ${page.pages} · ${page.total} total</span>
    <button aria-label=${'Previous '+label} ?disabled=${page.current===0} @click=${()=>change(page.current-1)}>Previous</button>
    <button aria-label=${'Next '+label} ?disabled=${page.current===page.pages-1} @click=${()=>change(page.current+1)}>Next</button>
  </nav>` : nothing;
}

export function directoryView(host, targets, canDial) {
  const people = sitePeople(host);
  const devices = host._directoryTab === 'devices';
  const query = String(host._directorySearch || '').trim().toLowerCase();
  const matches = (devices ? targets : people).filter(item=>[item.user_name,item.label,item.user_id,item.extension,item.id].some(value=>String(value || '').toLowerCase().includes(query)));
  const page = pageItems(matches,host._directoryPage);
  const update = value=>{host._directoryPage=value;host.requestUpdate();};
  return html`<section class="directory-workspace">
    <div class="section-heading"><h3>${devices ? 'Quick connections' : 'People at this site'}</h3><button class="text-button" aria-label="Refresh people" ?disabled=${host._peopleLoading} @click=${()=>host._loadPeople(true)}>${host._peopleLoading ? 'Updating…' : 'Refresh'}</button></div>
    <div class="directory-toolbar"><div class="route-options" aria-label="Directory">
      <button class=${!devices?'selected':''} aria-pressed=${!devices} @click=${()=>{host._directoryTab='people';update(0);}}>People · ${people.length}</button>
      <button class=${devices?'selected':''} aria-pressed=${devices} @click=${()=>{host._directoryTab='devices';update(0);}}>Devices · ${targets.length}</button>
    </div><input aria-label="Search contacts and devices" placeholder="Search name or extension" .value=${host._directorySearch || ''} @input=${event=>{host._directorySearch=event.target.value;update(0);}}></div>
    ${host._peopleError && !devices ? html`<p class="fine-print" role="status">${host._peopleError}</p>` : nothing}
    ${!matches.length ? html`<div class="empty compact">${query?'No matching contacts.':devices?'No saved devices. Dial an extension above.':host._peopleLoading?'Loading people…':'No other active HA users at this site.'}</div>` : html`<div class="contacts compact-contacts">${repeat(page.items,item=>item.user_id || item.id,item=>html`
      <button class="contact" ?disabled=${!canDial || Boolean(host._actionPending) || (!devices && item.state !== 'ready')} @click=${()=>host._runAction('directory:'+(item.user_id || item.id),()=>{
        if (!devices) return host._callDirectoryUser(item);
        if ((item.type || 'node') === 'node') { host._userPickerNodeId=item.node_id || item.id;host._userPickerTargetId=item.id;return host._callService('get_remote_users',{node_id:host._userPickerNodeId}); }
        return host._dialTarget(item.id,item.type,item.node_id);
      })}><span class="avatar">${String(item.user_name || item.label || item.id).slice(0,2).toUpperCase()}</span><span class="contact-text"><b>${item.user_name || item.label || item.id}</b><small>${devices ? item.type==='node'?'Home Assistant':item.trunk?'Gateway · '+item.trunk:'SIP · '+(item.extension || item.id) : item.state==='ready'?'Available to call':'Busy'}</small></span><span aria-hidden="true">↗</span></button>`)}</div>`}
    ${pager(page,'contacts page',update)}
  </section>`;
}
