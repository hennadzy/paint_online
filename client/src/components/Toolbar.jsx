import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".toolbar")) {
        setActiveGroup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    canvas.style.pointerEvents = "auto";
    setActiveGroup(null);
  };

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  const groups = {
    brush: ["brush", "line"],
    shapes: ["circle", "rect"],
    color: ["pipette", "fill"]
  };

  const getCurrentToolInGroup = (group) => {
    const groupTools = groups[group];
    return groupTools.find((tool) => toolState.toolName === tool) || groupTools[0];
  };

  const current = toolState.toolName;

  const renderButton = (toolName, ToolClass, cursorClass, label) => (
    <button
      className={`toolbar__btn ${current === toolName ? "active" : ""}`}
      onPointerUp={() => changeTool(ToolClass, cursorClass, toolName)}
    >
      <span className={`icon ${toolName}`} />
      <span className="tooltip">{label}</span>
    </button>
  );


  return (
    <div className="toolbar">
      {/* Brush group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup("brush")} ${current === getCurrentToolInGroup("brush") ? "active" : ""
            }`}
          onPointerUp={() => {
            const tool = getCurrentToolInGroup("brush");
            changeTool(tool === "brush" ? Brush : Line, `${tool}-cursor`, tool);
          }}
          onClick={() => toggleGroup("brush")}
        >
          <span className={`icon ${getCurrentToolInGroup("brush")}`} />
          <span className="tooltip">
            {getCurrentToolInGroup("brush") === "brush" ? "Кисть" : "Линия"}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "brush" ? "show" : ""}`}>
          {renderButton("brush", Brush, "brush-cursor", "Кисть")}
          {renderButton("line", Line, "line-cursor", "Линия")}
        </div>
      </div>

      {/* Shapes group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup("shapes")} ${current === getCurrentToolInGroup("shapes") ? "active" : ""
            }`}
          onPointerUp={() => {
            const tool = getCurrentToolInGroup("shapes");
            changeTool(tool === "circle" ? Circle : Rect, `${tool}-cursor`, tool);
          }}
          onClick={() => toggleGroup("shapes")}
        >
          <span className={`icon ${getCurrentToolInGroup("shapes")}`} />
          <span className="tooltip">
            {getCurrentToolInGroup("shapes") === "circle" ? "Круг" : "Прямоугольник"}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "shapes" ? "show" : ""}`}>
          {renderButton("circle", Circle, "circle-cursor", "Круг")}
          {renderButton("rect", Rect, "rect-cursor", "Прямоугольник")}
        </div>
      </div>

      {/* Color group */}
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${getCurrentToolInGroup("color")} ${current === getCurrentToolInGroup("color") ? "active" : ""
            }`}
          onPointerUp={() => {
            const tool = getCurrentToolInGroup("color");
            changeTool(tool === "pipette" ? Pipette : Fill, `${tool}-cursor`, tool);
          }}
          onClick={() => toggleGroup("color")}
        >
          <span className={`icon ${getCurrentToolInGroup("color")}`} />
          <span className="tooltip">
            {getCurrentToolInGroup("color") === "pipette" ? "Пипетка" : "Заливка"}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "color" ? "show" : ""}`}>
          {renderButton("pipette", Pipette, "pipette-cursor", "Пипетка")}
          {renderButton("fill", Fill, "fill-cursor", "Заливка")}
        </div>
      </div>

      {/* Eraser */}
      {renderButton("eraser", Eraser, "eraser-cursor", "Ластик")}

      {/* Text */}
      {renderButton("text", Text, "text-cursor", "Текст")}
    </div>
  );
});

export default Toolbar;
