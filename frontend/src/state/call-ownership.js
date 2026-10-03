export function ownsCall(call, userId, currentCallId = '') {
  if (!call?.call_id || !userId) return false;
  if (call.local_user_call && call.caller_user_id === userId) return true;
  if (call.direction === 'outgoing') return call.caller_user_id === userId;
  if (call.direction !== 'incoming') return false;
  if (call.target_user_id && call.target_user_id !== userId) return false;
  if (call.answered_by_user_id && call.answered_by_user_id !== userId) return false;
  if (call.status === 'active' || call.state === 'active') {
    return call.answered_by_user_id === userId || call.call_id === currentCallId;
  }
  return true;
}
