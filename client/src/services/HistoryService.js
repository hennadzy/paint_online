class HistoryService {
  constructor() {
    this.strokes = [];
    this.redoStacks = new Map();
    this.listeners = new Set();
  }

  addStroke(stroke, username = 'local') {
    if (!stroke.id) {
      stroke.id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    if (this.strokes.some(s => s.id === stroke.id)) {
      return false;
    }
    
    if (!stroke.username || stroke.username === 'local') {
      stroke.username = username;
    }
    
    this.strokes.push(stroke);
    this.redoStacks.set(username, []);
    
    this.emit('strokeAdded', { stroke });
    return true;
  }

  getStrokes() {
    return [...this.strokes];
  }

  setStrokes(strokes) {
    this.strokes = [...strokes];
    this.emit('strokesLoaded', { strokes: this.strokes });
  }

  clearStrokes() {
    this.strokes = [];
    this.redoStacks.clear();
    this.emit('strokesCleared', {});
  }

  undo(username = 'local') {
    const index = [...this.strokes].reverse().findIndex(s => s.username === username);
    
    if (index === -1) {
      return null;
    }
    
    const actualIndex = this.strokes.length - 1 - index;
    const removed = this.strokes.splice(actualIndex, 1)[0];
    
    if (!this.redoStacks.has(username)) {
      this.redoStacks.set(username, []);
    }
    this.redoStacks.get(username).push(removed);
    
    this.emit('strokeUndone', { stroke: removed, username });
    return removed;
  }

  redo(username = 'local') {
    const stack = this.redoStacks.get(username);
    
    if (!stack || stack.length === 0) {
      return null;
    }
    
    const restored = stack.pop();
    this.strokes.push(restored);
    
    this.emit('strokeRedone', { stroke: restored, username });
    return restored;
  }

  undoById(strokeId, fromUsername) {
    const index = this.strokes.findIndex(s => s.id === strokeId);
    
    if (index === -1) {
      return null;
    }
    
    const stroke = this.strokes[index];
    if (fromUsername && stroke.username && stroke.username !== fromUsername) {
      return null;
    }
    
    const removed = this.strokes.splice(index, 1)[0];
    const username = removed.username || 'local';
    const stack = this.redoStacks.get(username) || [];
    stack.push(removed);
    this.redoStacks.set(username, stack);
    
    this.emit('strokeUndone', { stroke: removed, username });
    return removed;
  }

  redoStroke(stroke) {
    return this.addStroke(stroke, stroke.username);
  }

  getRedoStackSize(username = 'local') {
    const stack = this.redoStacks.get(username);
    return stack ? stack.length : 0;
  }

  getUndoStackSize(username = 'local') {
    return this.strokes.filter(s => s.username === username).length;
  }

  canUndo(username = 'local') {
    return this.getUndoStackSize(username) > 0;
  }

  canRedo(username = 'local') {
    return this.getRedoStackSize(username) > 0;
  }

  on(event, callback) {
    this.listeners.add({ event, callback });
  }

  off(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  emit(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          this.emit('error', { error });
        }
      }
    });
  }
}

export default new HistoryService();
