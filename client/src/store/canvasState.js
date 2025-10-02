import { makeAutoObservable, observable } from "mobx";
import Brush from "../tools/Brush";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Eraser from "../tools/Eraser";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";
  myFigures = [];
  undoStack = [];
  redoStack = [];

  constructor() {
    makeAutoObservable(this, {
      canvas: observable,
    });
  }

  setSessionId(id) {
    this.sessionid = id;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setUsername(username) {
    this.username = username;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  addFigure(figure) {
    this.myFigures.push(figure);
    this.undoStack.push([...this.myFigures]);
  }

  undo() {
    if (this.undoStack.length > 0) {
      this.redoStack.push([...this.myFigures]);
      this.myFigures = this.undoStack.pop();
      this.redrawMyFigures();
      this.broadcastUndo();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.undoStack.push([...this.myFigures]);
      this.myFigures = this.redoStack.pop();
      this.redrawMyFigures();
      this.broadcastRedo();
    }
  }

  redrawMyFigures() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.myFigures.forEach((fig) => {
      switch (fig.type) {
        case "brush":
          Brush.staticDraw(ctx, fig.x, fig.y, fig.lineWidth, fig.strokeStyle, fig.isStart);
          break;
        case "rect":
          Rect.staticDraw(ctx, fig.x, fig.y, fig.width, fig.height, fig.strokeStyle, fig.lineWidth);
          break;
        case "circle":
          Circle.staticDraw(ctx, fig.x, fig.y, fig.radius, fig.strokeStyle, fig.lineWidth);
          break;
        case "line":
          Line.staticDraw(ctx, fig.x1, fig.y1, fig.x2, fig.y2, fig.strokeStyle, fig.lineWidth);
          break;
        case "eraser":
          Eraser.staticDraw(ctx, fig.x, fig.y, fig.lineWidth, "#FFFFFF", fig.isStart);
          break;
        default:
          console.warn("Неизвестный тип фигуры:", fig.type);
      }
    });
  }

  broadcastUndo() {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "undo",
        id: this.sessionid,
        username: this.username,
        figures: this.myFigures
      }));
    }
  }

  broadcastRedo() {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "redo",
        id: this.sessionid,
        username: this.username,
        figures: this.myFigures
      }));
    }
  }
}

export default new CanvasState();
