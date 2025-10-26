import toolState from "../store/toolState";

export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.mouseDown = false;
    this._hasCommitted = false;

    this.boundGlobalEnd = this.handleGlobalEnd.bind(this);
  }

  listenGlobalEndEvents() {
    window.addEventListener("mouseup", this.boundGlobalEnd);
    window.addEventListener("touchend", this.boundGlobalEnd);
    window.addEventListener("touchcancel", this.boundGlobalEnd);
  }

  removeGlobalEndEvents() {
    window.removeEventListener("mouseup", this.boundGlobalEnd);
    window.removeEventListener("touchend", this.boundGlobalEnd);
    window.removeEventListener("touchcancel", this.boundGlobalEnd);
  }

  handleGlobalEnd(e) {
    if (!this.mouseDown || this._hasCommitted) return;
    this.mouseDown = false;
    this._hasCommitted = true;
    if (this.commitStroke) this.commitStroke();
  }

  destroyEvents() {
    this.removeGlobalEndEvents();
  }
}
