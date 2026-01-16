class StrokeManager {
  constructor() {
    this.history = new Map();
    this.undoStacks = new Map();
    this.redoStacks = new Map();
  }

  addStroke(username, stroke) {
    if (!this.history.has(username)) this.history.set(username, []);
    this.history.get(username).push(stroke);
    this.clearRedo(username);
  }

  getStrokes(username) {
    return this.history.get(username) || [];
  }

  undo(username) {
    const strokes = this.history.get(username);
    if (strokes && strokes.length > 0) {
      const removed = strokes.pop();
      this.pushToRedo(username, removed);
      return removed;
    }
    return null;
  }

  redo(username) {
    const stack = this.redoStacks.get(username);
    if (stack && stack.length > 0) {
      const restored = stack.pop();
      this.addStroke(username, restored);
      return restored;
    }
    return null;
  }

  clearRedo(username) {
    this.redoStacks.set(username, []);
  }

  pushToRedo(username, stroke) {
    if (!this.redoStacks.has(username)) this.redoStacks.set(username, []);
    this.redoStacks.get(username).push(stroke);
  }

  resetUser(username) {
    this.history.delete(username);
    this.undoStacks.delete(username);
    this.redoStacks.delete(username);
  }
}

export default new StrokeManager();
