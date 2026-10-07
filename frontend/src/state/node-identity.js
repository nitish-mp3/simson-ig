export function connectionEntity(hass, config = {}, detected = '') {
  const states = hass?.states || {};
  if (config.connection_entity && states[config.connection_entity]) return states[config.connection_entity];
  const requested = config.node_id || detected;
  if (requested) {
    const exact = states[`sensor.simson_${requested}_connection`];
    if (exact) return exact;
    return Object.entries(states).find(([entityId, entity]) =>
      /^sensor\.simson_.+_connection$/.test(entityId) && entity.attributes?.node_id === requested)?.[1];
  }
  return Object.entries(states).find(([entityId]) => /^sensor\.simson_.+_connection$/.test(entityId))?.[1];
}

export function canonicalNodeId(hass, config = {}, detected = '') {
  return connectionEntity(hass, config, detected)?.attributes?.node_id || config.node_id || detected || '';
}

export function nodeEntity(hass, config, detected, suffix) {
  const states = hass?.states || {};
  const configured = config?.[`${suffix}_entity`];
  if (configured && states[configured]) return states[configured];
  if (suffix === 'connection') return connectionEntity(hass, config, detected);
  const connection = connectionEntity(hass, config, detected);
  const connectionId = Object.keys(states).find(entityId => states[entityId] === connection);
  const siblingId = connectionId?.replace(/_connection$/, `_${suffix}`);
  if (siblingId && states[siblingId]) return states[siblingId];
  const nodeId = canonicalNodeId(hass, config, detected);
  const exact = states[`sensor.simson_${nodeId}_${suffix}`];
  if (exact) return exact;
  return Object.entries(states).find(([entityId, entity]) =>
    entityId.startsWith('sensor.simson_') && entityId.endsWith(`_${suffix}`) &&
    entity.attributes?.node_id === nodeId)?.[1];
}
