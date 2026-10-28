export async function reportRoomMedia(host, stats) {
  if (!host._hass?.callService || !host._currentCallId || host._pc?.connectionState !== 'connected' ||
      (!host._initiatedHere && !host._answeredByMe)) return;
  const reports = [...stats.values()];
  const audioReady = !host._playbackBlocked &&
    reports.some(report => report.type === 'inbound-rtp' && report.kind === 'audio' && report.packetsReceived > 0) &&
    reports.some(report => report.type === 'outbound-rtp' && report.kind === 'audio' && report.packetsSent > 0);
  const videoReceived = reports.some(report => report.type === 'inbound-rtp' && report.kind === 'video' && report.framesDecoded > 0);
  const videoSent = reports.some(report => report.type === 'outbound-rtp' && report.kind === 'video' && report.framesEncoded > 0);
  for (const entity of Object.values(host._hass.states || {})) {
    const room = entity.attributes || {};
    if (!room.simson_room || room.call_id !== host._currentCallId || room.room_user_id !== host._hass.user?.id ||
        room.audio_mode !== 'browser' || !room.session_id || !['ringing','connecting','active','degraded'].includes(entity.state)) continue;
    for (const component of ['audio', 'video']) {
      if (room.call_id !== host._currentCallId || host._pc?.connectionState !== 'connected') return;
      if (component === 'audio' ? !audioReady : !videoSent || room.video_mode !== 'ha_camera' && !videoReceived || !['browser','ha_camera'].includes(room.video_mode)) continue;
      if (room.components?.[component] === 'ready') continue;
      host._roomMediaReports ||= new Map();
      const key = `${room.session_id}:${component}`;
      if ((host._roomMediaReports.get(key) || 0) > Date.now()) continue;
      host._roomMediaReports.set(key, Date.now() + 15000);
      try {
        await host._hass.callService('simson', 'report_room_component', {
          node_id: room.node_id, room_id: room.room_id, session_id: room.session_id, component, state: 'ready',
        });
        host._roomMediaReports.set(key, Infinity);
      } catch {}
    }
  }
}
