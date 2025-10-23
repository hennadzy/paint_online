class CanvasState {
  layers = new Map(); // username → canvas
  undoStacks = new Map(); // username → [dataURL]
  redoStacks = new Map(); // username → [dataURL]
  currentLayer = null;

  canvasContainer = null;
  socket = null;
  sessionid = null;
  username = "";

  constructor() {
    makeAutoObservable(this);
  }

  setUsername(name) {
    this.username = name;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setSessionId(id) {
    this.sessionid = id;
  }

  setCanvasContainer(container) {
    this.canvasContainer = container;
  }

  createLayerForUser(username) {
    if (this.layers.has(username)) return;

    const canvas = document.createElement("canvas");
    canvas.width = this.canvasContainer.offsetWidth;
    canvas.height = this.canvasContainer.offsetHeight;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = username === this.username ? "10" : "5";
    canvas.style.pointerEvents = username === this.username ? "auto" : "none";
    canvas.id = `layer-${username}`;

    this.canvasContainer.appendChild(canvas);
    this.layers.set(username, canvas);

    if (username === this.username) {
      this.currentLayer = canvas;
    }
  }

  getLayer(username) {
    return this.layers.get(username);
  }

  pushToUndo(username, dataURL) {
    if (!this.undoStacks.has(username)) this.undoStacks.set(username, []);
    this.undoStacks.get(username).push(dataURL);
  }

  pushToRedo(username, dataURL) {
    if (!this.redoStacks.has(username)) this.redoStacks.set(username, []);
    this.redoStacks.get(username).push(dataURL);
  }

  undo() {
    const layer = this.currentLayer;
    const ctx = layer.getContext("2d");
    const stack = this.undoStacks.get(this.username) || [];
    if (stack.length > 0) {
      const dataUrl = stack.pop();
      this.pushToRedo(this.username, layer.toDataURL());
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, layer.width, layer.height);
        ctx.drawImage(img, 0, 0);
      };
      this.socket?.send(JSON.stringify({
        method: "undo",
        id: this.sessionid,
        username: this.username,
        dataURL: dataUrl
      }));
    }
  }

  redo() {
    const layer = this.currentLayer;
    const ctx = layer.getContext("2d");
    const stack = this.redoStacks.get(this.username) || [];
    if (stack.length > 0) {
      const dataUrl = stack.pop();
      this.pushToUndo(this.username, layer.toDataURL());
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, layer.width, layer.height);
        ctx.drawImage(img, 0, 0);
      };
      this.socket?.send(JSON.stringify({
        method: "redo",
        id: this.sessionid,
        username: this.username,
        dataURL: dataUrl
      }));
    }
  }
}

export default new CanvasState();
