export const withFormatting = Base => class extends Base {
_callStateLabel(state) {
    const labels = {
      ended: "Completed", active: "Active", missed: "Missed",
      declined: "Declined", timeout: "No Answer", failed: "Failed",
      idle: "Idle", requesting: "Dialing", ringing: "Ringing",
      incoming: "Incoming",
    };
    return labels[state] || state;
  }

_formatDuration(seconds) {
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return `${m}m ${rem}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

_formatTime(timestamp) {
    try {
      const d = new Date(timestamp * 1000);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isToday) return timeStr;
      if (isYesterday) return `Yesterday ${timeStr}`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + timeStr;
    } catch { return ""; }
  }

_updateTimer() {
    if (!this._callStart) return;
    const el = this._root()?.querySelector("#call-timer");
    if (!el) return;
    const secs = Math.floor((Date.now() - this._callStart) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
  }

_esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

_root() { return this.shadowRoot; }

_hasEditingFocus() {
    const el = this._root()?.activeElement;
    if (!el) return false;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
  }
};

