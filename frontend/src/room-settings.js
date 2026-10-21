import {LitElement, html, nothing, css} from 'lit';

const openStates = new Set(['starting','ringing','connecting','active','degraded','ending','attention']);
const fields = ['label','room_user_id','caregiver_user_id','audio_mode','video_mode','sip_extension','camera_entity',
  'display_entity','start_script','stop_script','trigger_entity','trigger_enabled','trigger_mode','trigger_state',
  'trigger_cooldown_sec','setup_timeout_sec','max_duration_sec'];

export class SimsonRoomSettings extends LitElement {
  static properties = {_data:{state:true},_draft:{state:true},_selectedNode:{state:true},_error:{state:true},
    _notice:{state:true},_busy:{state:true},_query:{state:true},_page:{state:true},_confirmRemove:{state:true}};
  static styles = css`
    :host{display:block;font-family:var(--paper-font-body1_-_font-family,Arial,sans-serif);color:var(--primary-text-color,#e8f2f7)}
    *{box-sizing:border-box}header,.toolbar,.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    header{justify-content:space-between;margin-bottom:24px}h1{font-size:1.6rem;margin:0 0 6px}h2{font-size:1.1rem;margin:0 0 14px}
    p{line-height:1.5;margin:8px 0;overflow-wrap:anywhere}.hint{font-size:.86rem;color:var(--secondary-text-color,#a6b7c9)}
    .layout{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:20px}aside,form,.empty{background:var(--ha-card-background,var(--card-background-color,#152130));border-radius:18px;padding:20px;min-width:0}
    .rooms{display:grid;gap:8px;margin:16px 0}.room{text-align:left;width:100%;background:var(--secondary-background-color,#233242);color:inherit;border:1px solid transparent;display:grid;gap:4px}
    .room[aria-pressed=true]{border-color:var(--primary-color,#9de8ce)}.room small{color:var(--secondary-text-color,#a6b7c9)}
    label{display:grid;gap:7px;font-size:.88rem;min-width:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.full{grid-column:1/-1}
    input,select{width:100%;min-width:0;min-height:46px;border-radius:10px;border:1px solid var(--divider-color,#415365);padding:10px 12px;background:var(--primary-background-color,#0e1722);color:inherit;font:inherit}
    input[type=checkbox]{width:22px;min-height:22px;accent-color:var(--primary-color,#9de8ce)}.check{display:flex;align-items:center;gap:10px}
    fieldset{border:0;padding:0;margin:0 0 24px;min-width:0}legend{font-weight:600;margin-bottom:16px}details{margin:16px 0 24px}summary{cursor:pointer;padding:12px 0}details .grid{margin-top:12px}
    button,a{font:inherit}button{min-height:44px;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;background:var(--primary-color,#9de8ce);color:var(--text-primary-color,#0b2525)}
    button.secondary{background:var(--secondary-background-color,#233242);color:inherit}button.danger{background:var(--error-color,#9f323c);color:white}button:disabled{opacity:.5;cursor:default}
    button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--primary-color,#9de8ce);outline-offset:2px}
    .error{padding:12px;border-radius:10px;background:#752a3333;color:var(--error-color,#ffb4b4);margin-bottom:16px}.notice{padding:12px;border-radius:10px;background:#27775a33;margin-bottom:16px}
    .warning{border-left:3px solid #c69b50;padding:8px 12px;margin:12px 0;color:var(--primary-text-color,#f3d4a1)}.actions{border-top:1px solid var(--divider-color,#415365);padding-top:18px}
    a{color:var(--primary-color,#9de8ce)}.pager{display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:.85rem}
    @media(max-width:760px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.full{grid-column:auto}aside,form{padding:16px}header{align-items:flex-start}.toolbar{width:100%}.toolbar button{flex:1}}
  `;
  constructor() {
    super();this._data={nodes:[],users:[]};this._draft=null;this._selectedNode='';this._query='';this._page=0;
  }
  set hass(value) {
    this._hass=value;
    if(value?.user?.is_admin&&!this._loaded&&!this._loading)this._load();
    this.requestUpdate();
  }
  async _rpc(service,data={}) {
    const result=await this._hass.callWS({type:'call_service',domain:'simson',service,service_data:data,return_response:true});
    return result?.response || {};
  }
  async _load() {
    this._loading=true;this._busy=true;this._error='';
    try {
      this._data=await this._rpc('get_room_configuration');
      this._selectedNode ||= this._data.nodes[0]?.node_id || '';
      this._loaded=true;
      return true;
    }catch(error){this._error=error?.message || 'Room configuration could not be loaded. Retry when the integration is available.';return false;}
    finally{this._loading=false;this._busy=false;this.requestUpdate();}
  }
  _node(){return this._data.nodes.find(node=>node.node_id===this._selectedNode);}
  _set(key,value){this._draft={...this._draft,[key]:value};this._notice='';this._confirmRemove=false;}
  _new(source) {
    if(this._draft&&this._dirty()&&!window.confirm('Discard unsaved room changes?'))return;
    this._original=null;this._revision=0;this._manualId=false;this._confirmRemove=false;this._error='';this._notice='';
    this._draft={room_id:'',label:'',room_user_id:'',caregiver_user_id:source?.caregiver_user_id||'',
      audio_mode:source?.audio_mode||'browser',video_mode:source?.video_mode||'none',sip_extension:'',camera_entity:'',display_entity:'',
      start_script:source?.start_script||'',stop_script:source?.stop_script||'',trigger_entity:'',trigger_enabled:false,
      trigger_mode:'state',trigger_state:'on',trigger_cooldown_sec:source?.trigger_cooldown_sec||30,
      setup_timeout_sec:source?.setup_timeout_sec||60,max_duration_sec:source?.max_duration_sec||3600};
  }
  _edit(room) {
    if(this._draft&&this._dirty()&&!window.confirm('Discard unsaved room changes?'))return;
    this._original=room.room_id;this._revision=room.revision||0;this._confirmRemove=false;
    this._draft={room_id:room.room_id,...Object.fromEntries(fields.map(key=>[key,room[key]??(
      key==='trigger_enabled'?false:key==='trigger_cooldown_sec'?30:key==='trigger_mode'?'state':key==='trigger_state'?'on':'')]))};
    this._baseline=JSON.stringify(this._draft);this._error='';this._notice='';
  }
  _dirty(){return this._original?JSON.stringify(this._draft)!==this._baseline:Boolean(this._draft?.label||this._draft?.room_id);}
  _entities(domains){return Object.values(this._hass?.states||{}).filter(entity=>domains.includes(entity.entity_id?.split('.')[0]))
    .sort((first,second)=>(first.attributes?.friendly_name||first.entity_id).localeCompare(second.attributes?.friendly_name||second.entity_id));}
  _entityField(key,label,domains,hint='') {
    return html`<label>${label}<input name=${key} list=${'options-'+key} .value=${this._draft[key]||''}
      placeholder="Search by entity ID or choose a suggestion" @input=${event=>{
        this._set(key,event.target.value);
        if(key==='trigger_entity'&&['input_button','button','event'].includes(event.target.value.split('.')[0]))this._set('trigger_mode','press');
        if(key==='trigger_entity'&&['binary_sensor','input_boolean'].includes(event.target.value.split('.')[0]))this._set('trigger_mode','state');
      }} ?disabled=${this._busy}>
      <datalist id=${'options-'+key}>${this._entities(domains).map(entity=>html`<option value=${entity.entity_id}>${entity.attributes?.friendly_name||entity.entity_id}${['unavailable','unknown'].includes(entity.state)?' · unavailable':''}</option>`)}</datalist>
      ${hint?html`<span class="hint">${hint}</span>`:nothing}</label>`;
  }
  _userField(key,label){return html`<label>${label}<select name=${key} required .value=${this._draft[key]||''}
    @change=${event=>this._set(key,event.target.value)} ?disabled=${this._busy}><option value="">Choose a Home Assistant user</option>
    ${this._data.users.map(user=>html`<option value=${user.user_id} ?selected=${this._draft[key]===user.user_id}>${user.label}</option>`)}</select></label>`;}
  async _save(event) {
    event.preventDefault();if(this._busy)return;
    this._busy=true;this._error='';this._notice='';let saved=false;
    try {
      await this._rpc('configure_room',{node_id:this._selectedNode,room_id:this._draft.room_id,
        ...Object.fromEntries(fields.map(key=>[key,this._draft[key]])),expected_revision:this._revision});
      saved=true;const id=this._draft.room_id;
      if(!await this._load())throw Error('Configuration refresh failed.');
      const room=this._node()?.rooms.find(room=>room.room_id===id);
      if(room){this._draft=null;this._edit(room);}
      this._notice='Room saved. Its entities and enabled trigger are updated automatically.';
    }catch(error){this._error=(saved?'Saved, but refresh failed. Reload before editing again. ':'')+(error?.message||'Unable to save room.');}
    finally{this._busy=false;}
  }
  async _remove(){
    this._busy=true;this._error='';
    try{await this._rpc('configure_room',{node_id:this._selectedNode,room_id:this._original,remove:true,expected_revision:this._revision});
      this._draft=null;this._original=null;this._confirmRemove=false;await this._load();this._notice='Room removed. Its trigger is no longer active.';
    }catch(error){this._error=error?.message||'Unable to remove this room.';}finally{this._busy=false;}
  }
  async _control(room){
    this._busy=true;this._error='';
    try{const active=openStates.has(room.session?.state);
      await this._hass.callService('simson',active?'end_room_call':'start_room_call',{
        node_id:this._selectedNode,room_id:room.room_id,...(active?{session_id:room.session.session_id}:{})});
      await this._load();
    }catch(error){this._error=error?.message||'Room action failed. Check its session status before retrying.';}finally{this._busy=false;}
  }
  render(){
    if(!this._hass?.user?.is_admin)return html`<p role="alert">Room configuration is available to administrators only.</p>`;
    const node=this._node();const rooms=(node?.rooms||[]).filter(room=>(room.label+' '+room.room_id).toLowerCase().includes(this._query.toLowerCase()));
    const page=Math.min(this._page,Math.max(0,Math.ceil(rooms.length/8)-1));
    const editing=node?.rooms.find(room=>room.room_id===this._original);const active=openStates.has(editing?.session?.state);
    const split=this._draft&&(this._draft.audio_mode==='sip'||this._draft.video_mode==='adapter'||this._draft.display_entity);
    return html`<header><div><h1>Room workspace</h1><p class="hint">Connect room hardware once. Reuse the same controls and automations across your site.</p></div>
      <div class="toolbar"><button class="secondary" ?disabled=${this._busy} @click=${()=>this._load()}>Refresh devices</button>
      <button ?disabled=${this._busy||!node} @click=${()=>this._new()}>Add room</button></div></header>
      ${this._error?html`<div class="error" role="alert">${this._error}</div>`:nothing}${this._notice?html`<div class="notice" role="status">${this._notice}</div>`:nothing}
      <div class="layout"><aside><label>Simson site<select aria-label="Simson site" .value=${this._selectedNode} ?disabled=${this._busy}
        @change=${event=>{if(this._draft&&this._dirty()&&!window.confirm('Discard unsaved changes?')){event.target.value=this._selectedNode;return;}this._selectedNode=event.target.value;this._draft=null;this._page=0;}}>
        ${this._data.nodes.map(item=>html`<option value=${item.node_id} ?selected=${this._selectedNode===item.node_id}>${item.label}${item.connected?'':' · offline'}</option>`)}</select></label>
        <p class="hint">${node?.connected?'Connected':'Site offline — configuration remains editable; calls require connectivity.'}</p>
        <label>Find a room<input type="search" .value=${this._query} @input=${event=>{this._query=event.target.value;this._page=0;}}></label>
        <div class="rooms">${rooms.slice(page*8,page*8+8).map(room=>html`<button class="room" aria-pressed=${this._original===room.room_id}
          ?disabled=${this._busy} @click=${()=>this._edit(room)}><strong>${room.label}</strong><small>${room.session?.state||'idle'} · ${room.audio_mode==='sip'?'SIP audio':'Browser audio'}${room.trigger_enabled?' · trigger enabled':''}</small></button>`)}</div>
        ${!rooms.length?html`<p class="hint">${node?'No matching rooms. Add your first room to begin.':'No configured Simson site is available.'}</p>`:nothing}
        ${rooms.length>8?html`<div class="pager"><button class="secondary" ?disabled=${page===0} @click=${()=>this._page=page-1}>Previous</button><span>${page+1} / ${Math.ceil(rooms.length/8)}</span><button class="secondary" ?disabled=${(page+1)*8>=rooms.length} @click=${()=>this._page=page+1}>Next</button></div>`:nothing}
      </aside>${this._draft?html`<form @submit=${event=>this._save(event)}><h2>${this._original?'Edit room':'New room'}</h2>
        ${active?html`<p class="warning">This room has an open session. End it before changing its bindings.</p>`:nothing}
        <fieldset ?disabled=${this._busy||active}><legend>Identity and routing</legend><div class="grid">
          <label>Room name<input name="label" required maxlength="100" .value=${this._draft.label} @input=${event=>{
            this._set('label',event.target.value);if(!this._original&&!this._manualId)this._set('room_id',event.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64));}}></label>
          <label>Stable room ID<input name="room_id" required pattern="[a-z0-9][a-z0-9_-]{0,63}" .value=${this._draft.room_id} ?readonly=${Boolean(this._original)}
            @input=${event=>{this._manualId=true;this._set('room_id',event.target.value);}}><span class="hint">Generated from the name; existing IDs stay stable when renamed.</span></label>
          ${this._userField('room_user_id','Room / TV login')}${this._userField('caregiver_user_id','Default caregiver')}
        </div></fieldset>
        <fieldset ?disabled=${this._busy||active}><legend>Audio, camera and screen</legend><div class="grid">
          <label>Audio device<select name="audio_mode" .value=${this._draft.audio_mode} @change=${event=>{this._set('audio_mode',event.target.value);if(event.target.value==='sip'&&this._draft.video_mode==='browser')this._set('video_mode','adapter');}}>
            <option value="browser" ?selected=${this._draft.audio_mode==='browser'}>This room's browser / TV microphone</option><option value="sip" ?selected=${this._draft.audio_mode==='sip'}>Separate SIP phone</option></select></label>
          <label>Video source<select name="video_mode" .value=${this._draft.video_mode} @change=${event=>this._set('video_mode',event.target.value)}>
            <option value="none" ?selected=${this._draft.video_mode==='none'}>Voice only</option><option value="browser" ?selected=${this._draft.video_mode==='browser'} ?disabled=${this._draft.audio_mode==='sip'}>Browser / USB camera</option><option value="adapter" ?selected=${this._draft.video_mode==='adapter'}>Network camera / media integration</option></select></label>
          ${this._draft.audio_mode==='sip'?html`<label>SIP extension<input name="sip_extension" required pattern="[A-Za-z0-9_-]{1,64}" .value=${this._draft.sip_extension}
            @input=${event=>this._set('sip_extension',event.target.value)} placeholder="Registered handset extension"></label>`:nothing}
          ${this._draft.video_mode==='adapter'?this._entityField('camera_entity','Room camera',['camera'],'Choose the camera exposed by your camera/media integration.'):nothing}
          ${this._entityField('display_entity','Room display (optional)',['media_player','remote'],'Select the TV or player that should show the call.')}
        </div><p class="hint">Only one audio path is used. Merely showing a camera does not publish it to the caregiver.</p></fieldset>
        <fieldset ?disabled=${this._busy||active}><legend>Panic button / automatic trigger</legend><div class="grid">
          ${this._entityField('trigger_entity','Trigger device',['binary_sensor','input_boolean','input_button','button','event'])}
          <label>When to call<select name="trigger_mode" .value=${this._draft.trigger_mode} @change=${event=>this._set('trigger_mode',event.target.value)}><option value="state" ?selected=${this._draft.trigger_mode==='state'}>Changes to a specific state</option><option value="press" ?selected=${this._draft.trigger_mode==='press'}>Button press / new event</option></select></label>
          ${this._draft.trigger_mode==='state'?html`<label>Trigger state<input name="trigger_state" .value=${this._draft.trigger_state} @input=${event=>this._set('trigger_state',event.target.value)} placeholder="on"></label>`:nothing}
          <label>Cooldown (seconds)<input name="trigger_cooldown_sec" type="number" min="1" max="3600" .value=${String(this._draft.trigger_cooldown_sec)} @input=${event=>this._set('trigger_cooldown_sec',Number(event.target.value))}></label>
          <label class="check full"><input name="trigger_enabled" type="checkbox" .checked=${this._draft.trigger_enabled} @change=${event=>this._set('trigger_enabled',event.target.checked)}>Enable this room's automatic calling trigger</label>
        </div><p class="hint">Disabled by default. Saving never places a call. Offline/restart restoration and attribute-only updates do not trigger calls. Keep emergency alerts independent of call/media availability.</p></fieldset>
        <details ?open=${Boolean(split)}><summary>Media adapters and safety limits</summary><fieldset ?disabled=${this._busy||active}><div class="grid">
          ${this._entityField('start_script','Reusable start adapter',['script'],'One generic adapter can serve many rooms using the saved bindings.')}
          ${this._entityField('stop_script','Reusable cleanup adapter',['script'],'Must stop only this session and acknowledge stopped components.')}
          <label>Setup timeout (seconds)<input name="setup_timeout_sec" type="number" min="15" max="300" .value=${String(this._draft.setup_timeout_sec)} @input=${event=>this._set('setup_timeout_sec',Number(event.target.value))}></label>
          <label>Maximum call duration (seconds)<input name="max_duration_sec" type="number" min="60" max="14400" .value=${String(this._draft.max_duration_sec)} @input=${event=>this._set('max_duration_sec',Number(event.target.value))}></label>
        </div></fieldset>${split?html`<p class="warning">Split SIP/display/network-camera media requires working adapters. Select installed reusable scripts here; the UI does not create a SIP/video bridge or a TV camera driver.</p>`:nothing}</details>
        <div class="actions"><button type="submit" ?disabled=${this._busy||active}>${this._busy?'Working…':'Save room'}</button>
          ${this._original?html`<button type="button" class="secondary" ?disabled=${this._busy} @click=${()=>this._new(this._draft)}>Duplicate setup</button>
          <button type="button" class="secondary" ?disabled=${this._busy} @click=${()=>this._control(editing)}>${active?'End session / retry cleanup':'Call caregiver'}</button>
          <button type="button" class="danger" ?disabled=${this._busy||active} @click=${()=>this._confirmRemove=true}>Remove room</button>`:nothing}</div>
        ${this._confirmRemove?html`<div class="warning" role="alert"><p>Remove this room and disable its trigger? Existing HA automation references will need updating.</p><div class="actions"><button type="button" class="danger" ?disabled=${this._busy} @click=${()=>this._remove()}>Confirm removal</button><button type="button" class="secondary" @click=${()=>this._confirmRemove=false}>Cancel</button></div></div>`:nothing}
      </form>`:html`<div class="empty"><h2>One profile per room. Shared integration, not custom code.</h2><p>Choose a room to edit, or add one. Select users, room hardware and an optional panic trigger from this interface.</p><p class="hint">Room sensors and call/end buttons are created automatically for your dashboards and other HA automations.</p></div>`}</div>`;
  }
}

if(!customElements.get('simson-room-settings'))customElements.define('simson-room-settings',SimsonRoomSettings);
