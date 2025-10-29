import React from "react";
import { observer } from "mobx-react-lite";
import "../styles/toolbar.scss";
import toolState from "../store/toolState";
import canvasState from "../store/canvasState";
import Brush from "../tools/Brush";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Eraser from "../tools/Eraser";

const Toolbar = observer(() => {

  const changeTool = (ToolClass, cursorClass, toolName) => {
    const { canvas, socket, sessionid, username } = canvasState;
    if (!canvas) return;
    const safeUsername = username || "local";
    const tool = new ToolClass(canvas, socket, sessionid, safeUsername);
    toolState.setTool(tool, toolName);

    canvas.classList.remove(
      "brush-cursor",
      "eraser-cursor",
      "rect-cursor",
      "circle-cursor",
      "line-cursor"
    );
    canvas.classList.add(cursorClass);
  };

  const current = toolState.toolName;

  const renderButton = (toolName, ToolClass, cursorClass, label) => (
    <button
      className={`toolbar__btn ${toolName} ${current === toolName ? "active" : ""}`}
      onClick={() => changeTool(ToolClass, cursorClass, toolName)}
    >
      <span className={`icon ${toolName}`} />
      <span className="tooltip">{label}</span>
    </button>
  );

  return (
    <div className="toolbar">
      {renderButton("brush", Brush, "brush-cursor", "Кисть")}
      {renderButton("rect", Rect, "rect-cursor", "Прямоугольник")}
      {renderButton("circle", Circle, "circle-cursor", "Круг")}
      {renderButton("eraser", Eraser, "eraser-cursor", "Ластик")}
      {renderButton("line", Line, "line-cursor", "Линия")}
    </div>
  );
});

export default Toolbar;
