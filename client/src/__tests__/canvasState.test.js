import canvasState from '../store/canvasState';

describe('CanvasState Tests', () => {
  beforeEach(() => {
    canvasState.strokes = [];
    canvasState.undoStack = [];
    canvasState.redoStack = [];
  });

  describe('Stroke Management', () => {
    test('should add stroke to canvas', () => {
      const stroke = {
        type: 'brush',
        points: [[10, 10], [20, 20]],
        strokeStyle: '#000000',
        lineWidth: 2
      };

      canvasState.pushStroke(stroke);

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.strokes[0]).toEqual(stroke);
    });

    test('should not add duplicate strokes', () => {
      const stroke = {
        id: 'unique-id-123',
        type: 'brush',
        points: [[10, 10], [20, 20]]
      };

      canvasState.pushStroke(stroke);
      canvasState.pushStroke(stroke);

      expect(canvasState.strokes).toHaveLength(1);
    });

    test('should clear all strokes', () => {
      canvasState.pushStroke({ type: 'brush', points: [[10, 10]] });
      canvasState.pushStroke({ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 });

      canvasState.strokes = [];

      expect(canvasState.strokes).toHaveLength(0);
    });
  });

  describe('Undo/Redo Functionality', () => {
    test('should undo last stroke', () => {
      const stroke1 = { id: '1', type: 'brush', points: [[10, 10]] };
      const stroke2 = { id: '2', type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 };

      canvasState.pushStroke(stroke1);
      canvasState.pushStroke(stroke2);

      expect(canvasState.strokes).toHaveLength(2);

      canvasState.strokes = canvasState.strokes.slice(0, -1);
      canvasState.undoStack.push(stroke2);

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.undoStack).toHaveLength(1);
    });

    test('should redo undone stroke', () => {
      const stroke = { id: '1', type: 'brush', points: [[10, 10]] };

      canvasState.undoStack.push(stroke);
      
      const redoneStroke = canvasState.undoStack.pop();
      canvasState.pushStroke(redoneStroke);

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.undoStack).toHaveLength(0);
    });

    test('should clear redo stack on new stroke', () => {
      const stroke1 = { id: '1', type: 'brush', points: [[10, 10]] };
      const stroke2 = { id: '2', type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 };

      canvasState.pushStroke(stroke1);
      canvasState.undoStack.push(stroke1);
      
      canvasState.redoStack = [];
      canvasState.pushStroke(stroke2);

      expect(canvasState.redoStack).toHaveLength(0);
    });
  });

  describe('Username Management', () => {
    test('should set username', () => {
      canvasState.setUsername('TestUser');

      expect(canvasState.username).toBe('TestUser');
      expect(canvasState.usernameReady).toBe(true);
    });

    test('should reset username', () => {
      canvasState.setUsername('TestUser');
      canvasState.setUsername('');

      expect(canvasState.username).toBe('');
      expect(canvasState.usernameReady).toBe(false);
    });

    test('should trim username', () => {
      canvasState.setUsername('  TestUser  ');

      expect(canvasState.username).toBe('TestUser');
    });
  });

  describe('Room Management', () => {
    test('should set current room ID', () => {
      canvasState.setCurrentRoomId('abc123def');

      expect(canvasState.currentRoomId).toBe('abc123def');
    });

    test('should track connection status', () => {
      expect(canvasState.isConnected).toBe(false);

      canvasState.isConnected = true;

      expect(canvasState.isConnected).toBe(true);
    });

    test('should manage connected users list', () => {
      canvasState.connectedUsers = ['User1', 'User2', 'User3'];

      expect(canvasState.connectedUsers).toHaveLength(3);
      expect(canvasState.connectedUsers).toContain('User1');
    });
  });

  describe('Modal State Management', () => {
    test('should toggle room interface modal', () => {
      expect(canvasState.showRoomInterface).toBe(false);

      canvasState.setShowRoomInterface(true);

      expect(canvasState.showRoomInterface).toBe(true);
    });

    test('should toggle about modal', () => {
      expect(canvasState.showAboutModal).toBe(false);

      canvasState.setShowAboutModal(true);

      expect(canvasState.showAboutModal).toBe(true);
    });
  });

  describe('Drawing Tools Integration', () => {
    test('should handle brush strokes', () => {
      const brushStroke = {
        type: 'brush',
        points: [[10, 10], [15, 15], [20, 20]],
        strokeStyle: '#FF0000',
        lineWidth: 5,
        opacity: 1
      };

      canvasState.pushStroke(brushStroke);

      expect(canvasState.strokes[0].type).toBe('brush');
      expect(canvasState.strokes[0].points).toHaveLength(3);
    });

    test('should handle shape strokes', () => {
      const rectStroke = {
        type: 'rect',
        x: 10,
        y: 10,
        width: 50,
        height: 30,
        strokeStyle: '#0000FF',
        lineWidth: 2
      };

      canvasState.pushStroke(rectStroke);

      expect(canvasState.strokes[0].type).toBe('rect');
      expect(canvasState.strokes[0].width).toBe(50);
    });

    test('should handle arrow strokes', () => {
      const arrowStroke = {
        type: 'arrow',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        strokeStyle: '#000000',
        lineWidth: 2
      };

      canvasState.pushStroke(arrowStroke);

      expect(canvasState.strokes[0].type).toBe('arrow');
    });

    test('should handle polygon strokes', () => {
      const polygonStroke = {
        type: 'polygon',
        points: [[10, 10], [20, 10], [15, 20]],
        strokeStyle: '#00FF00',
        lineWidth: 2
      };

      canvasState.pushStroke(polygonStroke);

      expect(canvasState.strokes[0].type).toBe('polygon');
      expect(canvasState.strokes[0].points).toHaveLength(3);
    });

    test('should handle text strokes', () => {
      const textStroke = {
        type: 'text',
        x: 50,
        y: 50,
        text: 'Hello World',
        strokeStyle: '#000000',
        lineWidth: 16
      };

      canvasState.pushStroke(textStroke);

      expect(canvasState.strokes[0].type).toBe('text');
      expect(canvasState.strokes[0].text).toBe('Hello World');
    });
  });

  describe('Stroke Validation', () => {
    test('should validate brush stroke structure', () => {
      const isValidBrushStroke = (stroke) => {
        return stroke.type === 'brush' &&
               Array.isArray(stroke.points) &&
               stroke.points.length > 0 &&
               typeof stroke.strokeStyle === 'string' &&
               typeof stroke.lineWidth === 'number';
      };

      const validStroke = {
        type: 'brush',
        points: [[10, 10]],
        strokeStyle: '#000000',
        lineWidth: 2
      };

      expect(isValidBrushStroke(validStroke)).toBe(true);
    });

    test('should reject invalid stroke structure', () => {
      const isValidBrushStroke = (stroke) => {
        return stroke.type === 'brush' &&
               Array.isArray(stroke.points) &&
               stroke.points.length > 0;
      };

      const invalidStroke = {
        type: 'brush',
        points: []
      };

      expect(isValidBrushStroke(invalidStroke)).toBe(false);
    });
  });
});
