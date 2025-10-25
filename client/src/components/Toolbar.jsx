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
    canvasState.undo();
  };

  const safeRedo = () => {
    canvasState.redo();
  };

  const current = toolState.toolName;

  return (
    <div className="toolbar">
      <button
        className={`toolbar__btn brush ${current === "brush" ? "active" : ""}`}
        onPointerUp={() => changeTool(Brush, "brush-cursor", "brush")}
      />
      <button
        className={`toolbar__btn rect ${current === "rect" ? "active" : ""}`}
        onPointerUp={() => changeTool(Rect, "rect-cursor", "rect")}
      />
      <button
        className={`toolbar__btn circle ${current === "circle" ? "active" : ""}`}
        onPointerUp={() => changeTool(Circle, "circle-cursor", "circle")}
      />
      <button
        className={`toolbar__btn eraser ${current === "eraser" ? "active" : ""}`}
        onPointerUp={() => changeTool(Eraser, "eraser-cursor", "eraser")}
      />
      <button
        className={`toolbar__btn line ${current === "line" ? "active" : ""}`}
        onPointerUp={() => changeTool(Line, "line-cursor", "line")}
      />
      <input
        type="color"
        value={toolState.strokeColor}
        onChange={changeColor}
        style={{ marginLeft: 10 }}
      />
      <button
        className="toolbar__btn undo"
        onPointerUp={safeUndo}
      />
      <button
        className="toolbar__btn redo"
        onPointerUp={safeRedo}
      />
      <button
        className="toolbar__btn save"
        onPointerUp={download}
      />
    </div>
  );
});

export default Toolbar;
