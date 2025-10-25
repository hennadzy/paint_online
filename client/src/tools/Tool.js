export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.mouseDown = false;
    this.hasCommitted = false;

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

  handleGlobalEnd() {
    if (!this.mouseDown || this.hasCommitted) return;
    this.mouseDown = false;
    this.hasCommitted = true;

    if (this.commitStroke) {
      this.commitStroke();
    }
  }

  destroyEvents() {
    this.removeGlobalEndEvents();
  }
}
