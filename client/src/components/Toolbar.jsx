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
import Polygon from "../tools/Polygon";
import Arrow from "../tools/Arrow";

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

  const changeTool = (ToolClass, toolName) => {
    const { canvas, socket, sessionid, username } = canvasState;
    if (!canvas) return;
    const safeUsername = username || "local";
    const tool = new ToolClass(canvas, socket, sessionid, safeUsername);
    toolState.setTool(tool, toolName);
    canvas.style.pointerEvents = "auto";
    setActiveGroup(null);
  };

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  const toolClassMap = {
    brush: Brush,
    line: Line,
    arrow: Arrow,
    circle: Circle,
    rect: Rect,
    polygon: Polygon,
    pipette: Pipette,
    fill: Fill,
    eraser: Eraser,
    text: Text
  };

  const handleGroupClick = (group) => {
    if (activeGroup === group) {
      return;
    } 
    const toolName = toolState.getLastInGroup(group);
    const ToolClass = toolClassMap[toolName];
    changeTool(ToolClass, toolName);
    toggleGroup(group);
  }

  const renderButton = (toolName, ToolClass, label) => (
    <button
      className={`toolbar__btn ${toolState.toolName === toolName ? "active" : ""}`}
      onClick={() => changeTool(ToolClass, toolName)}
    >
      <span className={`icon ${toolName}`} />
      <span className="tooltip">{label}</span>
    </button>
  );

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${toolState.getLastInGroup("brush")} ${toolState.isToolInGroup(toolState.toolName, "brush") ? "active" : ""}`}
          onClick={() => handleGroupClick("brush")}
        >
          <span className={`icon ${toolState.getLastInGroup("brush")}`} />
          <span className="tooltip">
            {{"brush": "Кисть", "line": "Линия", "arrow": "Стрелка"}[toolState.getLastInGroup("brush")]}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "brush" ? "show" : ""}`}>
          {renderButton("brush", Brush, "Кисть")}
          {renderButton("line", Line, "Линия")}
          {renderButton("arrow", Arrow, "Стрелка")}
        </div>
      </div>

      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${toolState.getLastInGroup("shapes")} ${toolState.isToolInGroup(toolState.toolName, "shapes") ? "active" : ""}`}
          onClick={() => handleGroupClick("shapes")}
        >
          <span className={`icon ${toolState.getLastInGroup("shapes")}`} />
          <span className="tooltip">
            {{"circle": "Круг", "rect": "Прямоугольник", "polygon": "Многоугольник"}[toolState.getLastInGroup("shapes")]}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "shapes" ? "show" : ""}`}>
          {renderButton("circle", Circle, "Круг")}
          {renderButton("rect", Rect, "Прямоугольник")}
          {renderButton("polygon", Polygon, "Многоугольник")}
        </div>
      </div>

      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${toolState.getLastInGroup("color")} ${toolState.isToolInGroup(toolState.toolName, "color") ? "active" : ""}`}
          onClick={() => handleGroupClick("color")}
        >
          <span className={`icon ${toolState.getLastInGroup("color")}`} />
          <span className="tooltip">
            {{"pipette": "Пипетка", "fill": "Заливка"}[toolState.getLastInGroup("color")]}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "color" ? "show" : ""}`}>
          {renderButton("pipette", Pipette, "Пипетка")}
          {renderButton("fill", Fill, "Заливка")}
        </div>
      </div>

      {renderButton("eraser", Eraser, "Ластик")}
      {renderButton("text", Text, "Текст")}
      
      <button
        className="toolbar__btn"
        onClick={() => canvasState.toggleGrid()}
        title="Сетка"
      >
        <span className="icon grid" />
        <span className="tooltip">Сетка</span>
      </button>
      
      <button
        className="toolbar__btn"
        onClick={() => canvasState.clearCanvas()}
        title="Очистить холст"
      >
        <span className="icon clear" />
        <span className="tooltip">Очистить</span>
      </button>
    </div>
  );
});

export default Toolbar;
