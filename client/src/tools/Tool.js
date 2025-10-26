
export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.mouseDown = false;
    this._hasCommitted = false;

    this.boundGlobalMouseUp = this.handleGlobalEnd.bind(this);
    this.boundGlobalTouchEnd = this.handleGlobalEnd.bind(this);
    this.boundGlobalTouchCancel = this.handleGlobalEnd.bind(this);
  }

  listenGlobalEndEvents() {
    window.addEventListener("mouseup", this.boundGlobalMouseUp);
    window.addEventListener("touchend", this.boundGlobalTouchEnd, { passive: false });
    window.addEventListener("touchcancel", this.boundGlobalTouchCancel, { passive: false });
  }

  removeGlobalEndEvents() {
    window.removeEventListener("mouseup", this.boundGlobalMouseUp);
    window.removeEventListener("touchend", this.boundGlobalTouchEnd);
    window.removeEventListener("touchcancel", this.boundGlobalTouchCancel);
  }

 handleGlobalEnd(e) {
  const isTouch = e?.type?.startsWith("touch");

  // ✅ Только на мобильных игнорируем события вне холста
  if (isTouch && e && !this.canvas.contains(e.target)) return;

  if (!this.mouseDown || this._hasCommitted) return;
  this.mouseDown = false;
  this._hasCommitted = true;
  if (this.commitStroke) this.commitStroke();
}

  destroyEvents() {
    this.removeGlobalEndEvents();
  }
}

