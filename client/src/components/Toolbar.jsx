import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import "../styles/toolbar.scss";
import toolState from "../store/toolState";
import canvasState from "../store/canvasState";
import Brush from "../tools/Brush";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Eraser from "../tools/Eraser";
import Text from "../tools/Text";
import Fill from "../tools/Fill";
import Pipette from "../tools/Pipette";

const Toolbar = observer(() => {
  const [activeGroup, setActiveGroup] = useState(null);

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
      "line-cursor",
      "text-cursor",
      "fill-cursor",
      "pipette-cursor"
    );
    canvas.classList.add(cursorClass);
    canvas.style.pointerEvents = 'auto';
    setActiveGroup(null); // Close submenu after selection
  };

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  const groups = {
    brush: ['brush', 'line'],
    shapes: ['circle', 'rect'],
    color: ['pipette', 'fill'],
    eraser: ['eraser'],
    text: ['text']
  };

  const getCurrentToolInGroup = (group) => {
    const groupTools = groups[group];
    return groupTools.find(tool => toolState.toolName === tool) || groupTools[0];
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
      {/* Brush group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup('brush')} ${current === getCurrentToolInGroup('brush') ? "active" : ""}`}
          onPointerUp={() => {
            const currentTool = getCurrentToolInGroup('brush');
            if (currentTool === 'brush') {
              changeTool(Brush, "brush-cursor", "brush");
            } else {
              changeTool(Line, "line-cursor", "line");
            }
          }}
          onClick={() => toggleGroup('brush')}
        />
        <div className={`toolbar__submenu ${activeGroup === 'brush' ? 'show' : ''}`}>
          <button
            className={`toolbar__btn brush ${current === "brush" ? "active" : ""}`}
            onPointerUp={() => changeTool(Brush, "brush-cursor", "brush")}
          />
          <button
            className={`toolbar__btn line ${current === "line" ? "active" : ""}`}
            onPointerUp={() => changeTool(Line, "line-cursor", "line")}
          />
        </div>
      </div>

      {/* Shapes group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup('shapes')} ${current === getCurrentToolInGroup('shapes') ? "active" : ""}`}
          onPointerUp={() => {
            const currentTool = getCurrentToolInGroup('shapes');
            if (currentTool === 'circle') {
              changeTool(Circle, "circle-cursor", "circle");
            } else {
              changeTool(Rect, "rect-cursor", "rect");
            }
          }}
          onClick={() => toggleGroup('shapes')}
        />
        <div className={`toolbar__submenu ${activeGroup === 'shapes' ? 'show' : ''}`}>
          <button
            className={`toolbar__btn circle ${current === "circle" ? "active" : ""}`}
            onPointerUp={() => changeTool(Circle, "circle-cursor", "circle")}
          />
          <button
            className={`toolbar__btn rect ${current === "rect" ? "active" : ""}`}
            onPointerUp={() => changeTool(Rect, "rect-cursor", "rect")}
          />
        </div>
      </div>

      {/* Color group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup('color')} ${current === getCurrentToolInGroup('color') ? "active" : ""}`}
          onPointerUp={() => {
            const currentTool = getCurrentToolInGroup('color');
            if (currentTool === 'pipette') {
              changeTool(Pipette, "pipette-cursor", "pipette");
            } else {
              changeTool(Fill, "fill-cursor", "fill");
            }
          }}
          onClick={() => toggleGroup('color')}
        />
        <div className={`toolbar__submenu ${activeGroup === 'color' ? 'show' : ''}`}>
          <button
            className={`toolbar__btn pipette ${current === "pipette" ? "active" : ""}`}
            onPointerUp={() => changeTool(Pipette, "pipette-cursor", "pipette")}
          />
          <button
            className={`toolbar__btn fill ${current === "fill" ? "active" : ""}`}
            onPointerUp={() => changeTool(Fill, "fill-cursor", "fill")}
          />
        </div>
      </div>

      {/* Eraser */}
      <button
        className={`toolbar__btn eraser ${current === "eraser" ? "active" : ""}`}
        onPointerUp={() => changeTool(Eraser, "eraser-cursor", "eraser")}
      />

      {/* Text */}
      <button
        className={`toolbar__btn text ${current === "text" ? "active" : ""}`}
        onPointerUp={() => changeTool(Text, "text-cursor", "text")}
      />


    </div>
  );
});

export default Toolbar;
