/**
 * HistoryService - manages undo/redo history
 * Responsibilities: stroke management, undo/redo operations
 */
class HistoryService {
  constructor() {
    this.strokes = [];
    this.redoStacks = new Map();
    this.listeners = new Set();
  }

  /**
   * Add stroke to history
   */
  addStroke(stroke, username = 'local') {
    // Check if stroke already exists
    if (stroke.id && this.strokes.some(s => s.id === stroke.id)) {
      return false;
    }
    
    // Ensure username is set
    if (!stroke.username || stroke.username === 'local') {
      stroke.username = username;
    }
    
    this.strokes.push(stroke);
    
    // Clear redo stack for this user
    this.redoStacks.set(username, []);
    
    this.emit('strokeAdded', { stroke });
    return true;
  }

  /**
   * Get all strokes
   */
  getStrokes() {
    return [...this.strokes];
  }

  /**
   * Set strokes (used when loading from server)
   */
  setStrokes(strokes) {
    this.strokes = [...strokes];
    this.emit('strokesLoaded', { strokes: this.strokes });
  }

  /**
   * Clear all strokes
   */
  clearStrokes() {
    this.strokes = [];
    this.redoStacks.clear();
    this.emit('strokesCleared', {});
  }

  /**
   * Undo last stroke for user
   */
  undo(username = 'local') {
    // Find last stroke by this user
    const index = [...this.strokes].reverse().findIndex(s => s.username === username);
    
    if (index === -1) {
      return null;
    }
    
    const actualIndex = this.strokes.length - 1 - index;
    const removed = this.strokes.splice(actualIndex, 1)[0];
    
    // Add to redo stack
    if (!this.redoStacks.has(username)) {
      this.redoStacks.set(username, []);
    }
    this.redoStacks.get(username).push(removed);
    
    this.emit('strokeUndone', { stroke: removed, username });
    return removed;
  }

  /**
   * Redo last undone stroke for user
   */
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

  /**
   * Undo stroke by ID (for remote undo)
   */
  undoById(strokeId) {
    const index = this.strokes.findIndex(s => s.id === strokeId);
    
    if (index === -1) {
      return null;
    }
    
    const removed = this.strokes.splice(index, 1)[0];
    
    // Add to redo stack for the stroke's owner
    const username = removed.username || 'local';
    const stack = this.redoStacks.get(username) || [];
    stack.push(removed);
    this.redoStacks.set(username, stack);
    
    this.emit('strokeUndone', { stroke: removed, username });
    return removed;
  }

  /**
   * Redo stroke (for remote redo)
   */
  redoStroke(stroke) {
    return this.addStroke(stroke, stroke.username);
  }

  /**
   * Get redo stack size for user
   */
  getRedoStackSize(username = 'local') {
    const stack = this.redoStacks.get(username);
    return stack ? stack.length : 0;
  }

  /**
   * Get undo stack size for user
   */
  getUndoStackSize(username = 'local') {
    return this.strokes.filter(s => s.username === username).length;
  }

  /**
   * Check if can undo
   */
  canUndo(username = 'local') {
    return this.getUndoStackSize(username) > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(username = 'local') {
    return this.getRedoStackSize(username) > 0;
  }

  // Event system
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
          console.error(`Error in ${event} listener:`, error);
        }
      }
    });
  }
}

export default new HistoryService();
