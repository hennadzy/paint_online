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
import Hand from "../tools/Hand";
import RectSelect from "../tools/RectSelect";
import Lasso from "../tools/Lasso";

const Toolbar = observer(() => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [clickAnimation, setClickAnimation] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isToolbar = event.target.closest(".toolbar");
      const isCanvas =
        event.target.closest(".main-canvas") ||
        event.target.closest(".cursor-overlay") ||
        event.target.closest(".selection-overlay") ||
        event.target.closest(".canvas-wrapper") ||
        event.target.closest(".canvas-container");
      if (!isToolbar || isCanvas) {
        setActiveGroup(null);
      }
    };
    const useCapture = true;
    document.addEventListener("mousedown", handleClickOutside, useCapture);
    document.addEventListener("pointerdown", handleClickOutside, useCapture);
    document.addEventListener("touchstart", handleClickOutside, useCapture);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, useCapture);
      document.removeEventListener("pointerdown", handleClickOutside, useCapture);
      document.removeEventListener("touchstart", handleClickOutside, useCapture);
    };
  }, []);

  const changeTool = (ToolClass, toolName) => {
    const { canvas, socket, sessionId, username } = canvasState;
    if (!canvas) return;
    const safeUsername = username || "local";
    const tool = new ToolClass(canvas, socket, sessionId, safeUsername);
    toolState.setTool(tool, toolName);
    canvas.style.pointerEvents = "auto";
    setActiveGroup(null);
  };

  const toggleGroup = (group) => {
    setActiveGroup(activeGroup === group ? null : group);
  };

  const toolClassMap = {
    hand: Hand,
    select: RectSelect,
    lasso: Lasso,
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

  const selectionLabels = {
    select: "Выделение",
    lasso: "Лассо"
  };

  const handleGroupClick = (group) => {
    if (activeGroup === group) {
      toggleGroup(group);
      return;
    }
    const toolName = toolState.getLastInGroup(group);
    const ToolClass = toolClassMap[toolName];
    changeTool(ToolClass, toolName);
    toggleGroup(group);
  };

  const renderButton = (toolName, ToolClass, label) => (
    <button
      type="button"
      className={`toolbar__btn ${toolState.toolName === toolName ? "active" : ""}`}
      onClick={() => changeTool(ToolClass, toolName)}
      onMouseDown={(e) => e.target.blur()}
    >
      <span className={`icon ${toolName}`} />
      <span className="tooltip">{label}</span>
    </button>
  );

  const handleActionClick = (action, buttonId) => {
    action();
    setClickAnimation(buttonId);
    setTimeout(() => setClickAnimation(null), 1000);
    setActiveGroup(null);
  };

  return (
    <div className="toolbar" data-nosnippet>
      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn ${toolState.getLastInGroup("brush")} ${toolState.isToolInGroup(toolState.toolName, "brush") ? "active" : ""}`}
          onClick={() => handleGroupClick("brush")}
          onMouseDown={(e) => e.target.blur()}
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
          type="button"
          className={`toolbar__btn ${toolState.getLastInGroup("shapes")} ${toolState.isToolInGroup(toolState.toolName, "shapes") ? "active" : ""}`}
          onClick={() => handleGroupClick("shapes")}
          onMouseDown={(e) => e.target.blur()}
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
          type="button"
          className={`toolbar__btn ${toolState.getLastInGroup("color")} ${toolState.isToolInGroup(toolState.toolName, "color") ? "active" : ""}`}
          onClick={() => handleGroupClick("color")}
          onMouseDown={(e) => e.target.blur()}
        >
          <span className={`icon ${toolState.getLastInGroup("color")}`} />
          <span className="tooltip">
            {{"pipette": "Пипетка", "fill": "Заливка"}[toolState.getLastInGroup("color")]}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "color" ? "show" : ""}`}>
          {renderButton("fill", Fill, "Заливка")}
          {renderButton("pipette", Pipette, "Пипетка")}
        </div>
      </div>

      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn eraser ${toolState.isToolInGroup(toolState.toolName, "eraser") ? "active" : ""}`}
          onClick={() => handleGroupClick("eraser")}
          onMouseDown={(e) => e.target.blur()}
        >
          <span className="icon eraser" />
          <span className="tooltip">Ластик</span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "eraser" ? "show" : ""}`}>
          {renderButton("eraser", Eraser, "Ластик")}
          <button
            type="button"
            className={`toolbar__btn ${clickAnimation === "clear" ? "click-animation" : ""}`}
            onClick={() => handleActionClick(() => canvasState.clearCanvas(), "clear")}
            onMouseDown={(e) => e.target.blur()}
            title="Очистить холст"
          >
            <span className="icon clear" />
            <span className="tooltip">Очистить</span>
          </button>
        </div>
      </div>

      {renderButton("text", Text, "Текст")}

      <button
        type="button"
        className={`toolbar__btn ${clickAnimation === "grid" ? "click-animation" : ""}`}
        onClick={() => handleActionClick(() => canvasState.toggleGrid(), "grid")}
        onMouseDown={(e) => e.target.blur()}
        title="Сетка"
      >
        <span className="icon grid" />
        <span className="tooltip">Сетка</span>
      </button>

      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn ${toolState.getLastInGroup("selection")} ${toolState.isToolInGroup(toolState.toolName, "selection") ? "active" : ""}`}
          onClick={() => handleGroupClick("selection")}
          onMouseDown={(e) => e.target.blur()}
        >
          <span className={`icon ${toolState.getLastInGroup("selection")}`} />
          <span className="tooltip">
            {selectionLabels[toolState.getLastInGroup("selection")]}
          </span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === "selection" ? "show" : ""}`}>
          {renderButton("select", RectSelect, "Выделение (M)")}
          {renderButton("lasso", Lasso, "Лассо (Q)")}
        </div>
      </div>

      {renderButton("hand", Hand, "Рука (H)")}

      <button
        type="button"
        className={`toolbar__btn zoom-btn ${clickAnimation === "zoomOut" ? "click-animation" : ""}`}
        onClick={() => handleActionClick(() => canvasState.zoomOut(), "zoomOut")}
        onMouseDown={(e) => e.target.blur()}
        title="Уменьшить (Ctrl+-)"
      >
        <span className="icon minus" />
        <span className="tooltip">Уменьшить</span>
      </button>

      <button
        type="button"
        className={`toolbar__btn zoom-btn ${clickAnimation === "zoomIn" ? "click-animation" : ""}`}
        onClick={() => handleActionClick(() => canvasState.zoomIn(), "zoomIn")}
        onMouseDown={(e) => e.target.blur()}
        title="Увеличить (Ctrl++)"
      >
        <span className="icon plus" />
        <span className="tooltip">Увеличить</span>
      </button>
    </div>
  );
});

export default Toolbar;
