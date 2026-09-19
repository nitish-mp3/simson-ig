import { CallSession } from '../session.js';

const connections = new WeakMap();

export function acquireSession(view, hass, config) {
  const connection = hass.connection || hass;
  let sessions = connections.get(connection);
  if (!sessions) connections.set(connection, sessions = new Map());
  const configuredNode = config.node_id || [config.connection_entity, config.call_state_entity, config.calls_count_entity]
    .map(value => value?.match(/^sensor\.simson_(.+)_(?:connection|call_state|calls_count)$/)?.[1]).find(Boolean);
  const node = configuredNode || Object.keys(hass.states || {}).map(value => value.match(/^sensor\.simson_(.+)_connection$/)?.[1]).find(Boolean) || '';
  const key = `${hass.user?.id || ''}:${node}`;
  let session = sessions.get(key);
  if (!session) {
    session = new CallSession();
    session.hidden = true;
    session.setConfig({...config,node_id:node});
    session.hass = hass;
    session._release = () => sessions.delete(key);
    sessions.set(key,session);
    document.body.append(session);
  }
  clearTimeout(session._releaseTimer);
  if (!session.views.has(view) || view._sessionConfig !== config) {
    session.views.add(view);
    view._sessionConfig = config;
    const existing = session._config;
    const targets = [...session.views].flatMap(item => {
      const value = item._config.target_nodes;
      return Array.isArray(value) ? value : value ? [value] : [];
    });
    session.setConfig({...existing, ...config, node_id:node, target_nodes:targets});
    if (config.view === 'history') session._loadHistory();
    if (config.view === 'devices') session._refreshMediaDevices(false);
  }
  return session;
}

export function releaseSession(session, view) {
  session.views.delete(view);
  if (!session.views.size) {
    session._releaseTimer = setTimeout(() => {
      if (session.views.size) return;
      session.remove();
      session._release();
    }, 0);
  }
}
