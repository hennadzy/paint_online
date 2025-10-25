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
  const changeColor = (e) => {
    toolState.setStrokeColor(e.target.value);
  };

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

  const download = () => {
    const dataUrl = canvasState.canvas.toDataURL();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = canvasState.sessionid + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const safeUndo = () => {
    if (canvasState.isDrawing) return;
    setTimeout(() => canvasState.undo(), 50);
  };

  const safeRedo = () => {
    if (canvasState.isDrawing) return;
    setTimeout(() => canvasState.redo(), 50);
  };

  const current = toolState.toolName;

  return (
    <div className="toolbar">
      <button
        className={`toolbar__btn brush ${current === "brush" ? "active" : ""}`}
        onClick={() => changeTool(Brush, "brush-cursor", "brush")}
        onTouchEnd={() => changeTool(Brush, "brush-cursor", "brush")}
      />
      <button
        className={`toolbar__btn rect ${current === "rect" ? "active" : ""}`}
        onClick={() => changeTool(Rect, "rect-cursor", "rect")}
        onTouchEnd={() => changeTool(Rect, "rect-cursor", "rect")}
      />
      <button
        className={`toolbar__btn circle ${current === "circle" ? "active" : ""}`}
        onClick={() => changeTool(Circle, "circle-cursor", "circle")}
        onTouchEnd={() => changeTool(Circle, "circle-cursor", "circle")}
      />
      <button
        className={`toolbar__btn eraser ${current === "eraser" ? "active" : ""}`}
        onClick={() => changeTool(Eraser, "eraser-cursor", "eraser")}
        onTouchEnd={() => changeTool(Eraser, "eraser-cursor", "eraser")}
      />
      <button
        className={`toolbar__btn line ${current === "line" ? "active" : ""}`}
        onClick={() => changeTool(Line, "line-cursor", "line")}
        onTouchEnd={() => changeTool(Line, "line-cursor", "line")}
      />
      <input
        type="color"
        value={toolState.strokeColor}
        onChange={changeColor}
        style={{ marginLeft: 10 }}
      />
      <button
        className="toolbar__btn undo"
        onClick={safeUndo}
        onTouchEnd={safeUndo}
      />
      <button
        className="toolbar__btn redo"
        onClick={safeRedo}
        onTouchEnd={safeRedo}
      />
      <button
        className="toolbar__btn save"
        onClick={download}
        onTouchEnd={download}
      />
    </div>
  );
});

export default Toolbar;
