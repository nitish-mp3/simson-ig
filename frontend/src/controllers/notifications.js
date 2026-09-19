export const withNotifications = Base => class extends Base {
_playRingtone() {
    this._stopRingtone();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._ringCtx = ctx;
      this._ringLoop = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 480;
          g2.gain.setValueAtTime(0.15, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
        }, 200);
      }, 3000);
    } catch (e) { /* audio context not available */ }
  }

_stopRingtone() {
    if (this._ringLoop) { clearInterval(this._ringLoop); this._ringLoop = null; }
    if (this._ringCtx) { this._ringCtx.close().catch(() => {}); this._ringCtx = null; }
  }

_showIncomingPopup() { this._showPopup = true; this._render(); }

_removePopup() { this._showPopup = false; this._render(); }

_showUserPickerPopup() { this._pickerOpen = true; this._render(); }

_removeUserPicker() { this._pickerOpen = false; this._userPickerNodeId = ""; this._userPickerTargetId = ""; this._render(); }

async _requestNotificationPermission() {
    if (typeof Notification === "undefined") return;
    try {
      this._notifPermission = await Notification.requestPermission();
      this._render();
    } catch (e) { /* ignore */ }
  }

_showBrowserNotification(caller, callType) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    this._dismissBrowserNotification();
    try {
      this._activeNotification = new Notification("Incoming Call", {
        body: `\u{1F4DE} ${caller} \u2014 ${callType} call`,
        tag: "simson-incoming-call",
        requireInteraction: true,
      });
      this._activeNotification.onclick = () => { window.focus(); this._activeNotification.close(); };
    } catch (e) { /* ignore */ }
  }

_dismissBrowserNotification() {
    if (this._activeNotification) { this._activeNotification.close(); this._activeNotification = null; }
  }
};
