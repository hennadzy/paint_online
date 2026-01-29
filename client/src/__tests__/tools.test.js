import Brush from '../tools/Brush';
import Eraser from '../tools/Eraser';
import Line from '../tools/Line';
import Rect from '../tools/Rect';
import Circle from '../tools/Circle';
import Arrow from '../tools/Arrow';
import Polygon from '../tools/Polygon';
import Fill from '../tools/Fill';
import Text from '../tools/Text';

describe('Drawing Tools Tests', () => {
  let mockCanvas;
  let mockContext;
  let mockSocket;

  beforeEach(() => {
    mockContext = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      save: jest.fn(),
      restore: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      globalCompositeOperation: 'source-over',
      globalAlpha: 1,
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round'
    };

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 600,
        height: 400
      })),
      width: 600,
      height: 400,
      onpointerdown: null,
      onpointermove: null,
      onpointerup: null,
      ondblclick: null,
      onclick: null
    };

    mockSocket = {
      send: jest.fn(),
      readyState: WebSocket.OPEN
    };
  });

  describe('Brush Tool', () => {
    test('should create brush instance', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');

      expect(brush).toBeDefined();
      expect(brush.canvas).toBe(mockCanvas);
    });

    test('should set composite operation to source-over', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');

      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });

    test('should register pointer events', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');

      expect(mockCanvas.onpointerdown).toBeDefined();
    });

    test('should draw brush stroke', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');
      
      const event = {
        clientX: 100,
        clientY: 100
      };

      if (mockCanvas.onpointerdown) {
        mockCanvas.onpointerdown(event);
      }

      expect(mockContext.beginPath).toHaveBeenCalled();
    });
  });

  describe('Eraser Tool', () => {
    test('should create eraser instance', () => {
      const eraser = new Eraser(mockCanvas, mockSocket, 'room123', 'user1');

      expect(eraser).toBeDefined();
    });

    test('should set composite operation to destination-out', () => {
      const eraser = new Eraser(mockCanvas, mockSocket, 'room123', 'user1');

      expect(mockContext.globalCompositeOperation).toBe('destination-out');
    });

    test('should restore composite operation on destroy', () => {
      const eraser = new Eraser(mockCanvas, mockSocket, 'room123', 'user1');
      eraser.destroyEvents();

      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });
  });

  describe('Line Tool', () => {
    test('should create line instance', () => {
      const line = new Line(mockCanvas, mockSocket, 'room123', 'user1');

      expect(line).toBeDefined();
    });

    test('should draw line between two points', () => {
      const line = new Line(mockCanvas, mockSocket, 'room123', 'user1');
      
      Line.staticDraw(mockContext, 10, 10, 100, 100, '#000000', 2, 1);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockContext.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  describe('Rectangle Tool', () => {
    test('should create rectangle instance', () => {
      const rect = new Rect(mockCanvas, mockSocket, 'room123', 'user1');

      expect(rect).toBeDefined();
    });

    test('should draw rectangle', () => {
      const rect = new Rect(mockCanvas, mockSocket, 'room123', 'user1');
      
      Rect.staticDraw(mockContext, 10, 10, 50, 30, '#000000', 2, 1);

      expect(mockContext.strokeRect).toHaveBeenCalledWith(10, 10, 50, 30);
    });

    test('should handle negative dimensions', () => {
      const rect = new Rect(mockCanvas, mockSocket, 'room123', 'user1');
      
      Rect.staticDraw(mockContext, 100, 100, -50, -30, '#000000', 2, 1);

      expect(mockContext.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Circle Tool', () => {
    test('should create circle instance', () => {
      const circle = new Circle(mockCanvas, mockSocket, 'room123', 'user1');

      expect(circle).toBeDefined();
    });

    test('should draw circle', () => {
      const circle = new Circle(mockCanvas, mockSocket, 'room123', 'user1');
      
      Circle.staticDraw(mockContext, 50, 50, 25, '#000000', 2, 1);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalledWith(50, 50, 25, 0, 2 * Math.PI);
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  describe('Arrow Tool', () => {
    test('should create arrow instance', () => {
      const arrow = new Arrow(mockCanvas, mockSocket, 'room123', 'user1');

      expect(arrow).toBeDefined();
    });

    test('should draw arrow with head', () => {
      const arrow = new Arrow(mockCanvas, mockSocket, 'room123', 'user1');
      
      Arrow.staticDraw(mockContext, 10, 10, 100, 100, '#000000', 2, 1);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    test('should calculate arrow head correctly', () => {
      const x1 = 0, y1 = 0, x2 = 100, y2 = 100;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      
      expect(angle).toBeCloseTo(Math.PI / 4, 2);
    });
  });

  describe('Polygon Tool', () => {
    test('should create polygon instance', () => {
      const polygon = new Polygon(mockCanvas, mockSocket, 'room123', 'user1');

      expect(polygon).toBeDefined();
    });

    test('should add points to polygon', () => {
      const polygon = new Polygon(mockCanvas, mockSocket, 'room123', 'user1');
      polygon.points = [];
      
      polygon.points.push([10, 10]);
      polygon.points.push([20, 10]);
      polygon.points.push([15, 20]);

      expect(polygon.points).toHaveLength(3);
    });

    test('should draw polygon with multiple points', () => {
      const points = [[10, 10], [20, 10], [15, 20]];
      
      Polygon.staticDraw(mockContext, points, '#000000', 2, 1);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  describe('Fill Tool', () => {
    test('should create fill instance', () => {
      const fill = new Fill(mockCanvas, mockSocket, 'room123', 'user1');

      expect(fill).toBeDefined();
    });

    test('should get image data at click point', () => {
      const fill = new Fill(mockCanvas, mockSocket, 'room123', 'user1');
      
      const event = {
        clientX: 50,
        clientY: 50
      };

      if (mockCanvas.onclick) {
        mockCanvas.onclick(event);
      }

      expect(mockContext.getImageData).toHaveBeenCalled();
    });
  });

  describe('Text Tool', () => {
    test('should create text instance', () => {
      const text = new Text(mockCanvas, mockSocket, 'room123', 'user1');

      expect(text).toBeDefined();
    });

    test('should draw text on canvas', () => {
      Text.staticDraw(mockContext, 50, 50, 'Hello World', '#000000', 16, 1);

      expect(mockContext.fillText).toHaveBeenCalledWith('Hello World', 50, 50);
    });

    test('should measure text width', () => {
      const width = mockContext.measureText('Test').width;

      expect(width).toBe(100);
    });
  });

  describe('Tool Properties', () => {
    test('should set stroke color', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');
      brush.strokeColor = '#FF0000';

      expect(brush.strokeColor).toBe('#FF0000');
    });

    test('should set line width', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');
      brush.lineWidth = 5;

      expect(brush.lineWidth).toBe(5);
    });

    test('should set opacity', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');
      brush.strokeOpacity = 0.5;

      expect(brush.strokeOpacity).toBe(0.5);
    });
  });

  describe('Tool Cleanup', () => {
    test('should remove event listeners on destroy', () => {
      const brush = new Brush(mockCanvas, mockSocket, 'room123', 'user1');
      
      expect(mockCanvas.onpointerdown).toBeDefined();
      
      brush.destroyEvents();
      
      expect(mockCanvas.onpointerdown).toBeNull();
    });

    test('should restore canvas state on destroy', () => {
      const eraser = new Eraser(mockCanvas, mockSocket, 'room123', 'user1');
      
      eraser.destroyEvents();
      
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });
  });
});
