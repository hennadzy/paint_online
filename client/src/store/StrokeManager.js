class StrokeManager {
  constructor() {
    this.history = new Map(); // username → [stroke]
    this.undoStacks = new Map(); // username → [stroke]
    this.redoStacks = new Map(); // username → [stroke]
  }

  // Добавить stroke в историю
  addStroke(username, stroke) {
    if (!this.history.has(username)) this.history.set(username, []);
    this.history.get(username).push(stroke);
    this.clearRedo(username);
  }

  // Получить все stroke пользователя
  getStrokes(username) {
    return this.history.get(username) || [];
  }

  // Удалить последний stroke и вернуть его
  undo(username) {
    const strokes = this.history.get(username);
    if (strokes && strokes.length > 0) {
      const removed = strokes.pop();
      this.pushToRedo(username, removed);
      return removed;
    }
    return null;
  }

  // Вернуть последний отменённый stroke
  redo(username) {
    const stack = this.redoStacks.get(username);
    if (stack && stack.length > 0) {
      const restored = stack.pop();
      this.addStroke(username, restored);
      return restored;
    }
    return null;
  }

  // Очистить redo при новом действии
  clearRedo(username) {
    this.redoStacks.set(username, []);
  }

  // Добавить в redo
  pushToRedo(username, stroke) {
    if (!this.redoStacks.has(username)) this.redoStacks.set(username, []);
    this.redoStacks.get(username).push(stroke);
  }

  // Очистить всё (например, при выходе)
  resetUser(username) {
    this.history.delete(username);
    this.undoStacks.delete(username);
    this.redoStacks.delete(username);
  }
}

export default new StrokeManager();
