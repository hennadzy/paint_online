import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import "../styles/toolbar.scss";
import toolState from "../store/toolState";
import canvasState from "../store/canvasState";
import capabilitiesState from "../store/capabilitiesState";
import { formatToolTooltip } from "../config/toolHotkeys";
import Brush from "../tools/Brush";
import Marker from "../tools/brush/Marker";
import Airbrush from "../tools/brush/Airbrush";
import Smudge from "../tools/brush/Smudge";
import Watercolor from "../tools/brush/Watercolor";
import Oil from "../tools/brush/Oil";
import Pastel from "../tools/brush/Pastel";
import Calligraphy from "../tools/brush/Calligraphy";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Ellipse from "../tools/Ellipse";
import Stamp from "../tools/Stamp";
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

const TOOL_CLASSES = {
  hand: Hand,
  select: RectSelect,
  lasso: Lasso,
  brush: Brush,
  marker: Marker,
  airbrush: Airbrush,
  smudge: Smudge,
  watercolor: Watercolor,
  oil: Oil,
  pastel: Pastel,
  calligraphy: Calligraphy,
  line: Line,
  arrow: Arrow,
  circle: Circle,
  rect: Rect,
  ellipse: Ellipse,
  stamp: Stamp,
  polygon: Polygon,
  pipette: Pipette,
  fill: Fill,
  eraser: Eraser,
  text: Text,
};

const GROUP_TOOL_ENTRIES = {
  brush: [
    ["brush", Brush, "Кисть"],
    ["line", Line, "Линия"],
    ["arrow", Arrow, "Стрелка"],
  ],
  brushExtra: [
    ["marker", Marker, "Маркер"],
    ["airbrush", Airbrush, "Аэрограф"],
    ["smudge", Smudge, "Размытие"],
  ],
  brushPro: [
    ["watercolor", Watercolor, "Акварель"],
    ["oil", Oil, "Масляная"],
    ["pastel", Pastel, "Пастель"],
    ["calligraphy", Calligraphy, "Каллиграфия"],
  ],
  shapes: [
    ["circle", Circle, "Круг"],
    ["rect", Rect, "Прямоугольник"],
    ["polygon", Polygon, "Многоугольник"],
    ["ellipse", Ellipse, "Эллипс"],
    ["stamp", Stamp, "Штампы"],
  ],
  color: [
    ["fill", Fill, "Заливка"],
    ["pipette", Pipette, "Пипетка"],
  ],
  eraser: [
    ["eraser", Eraser, "Ластик"],
  ],
  selection: [
    ["select", RectSelect, "Выделение"],
    ["lasso", Lasso, "Лассо"],
  ],
};

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

  const handleGroupClick = (group) => {
    if (activeGroup === group) {
      toggleGroup(group);
      return;
    }
    const toolName = toolState.getLastInGroup(group);
    const ToolClass = TOOL_CLASSES[toolName];
    if (!ToolClass) return;
    changeTool(ToolClass, toolName);
    toggleGroup(group);
  };

  const toolLabel = (name, label) => formatToolTooltip(label, name);

  const renderButton = (toolName, ToolClass, label) => (
    <button
      type="button"
      className={`toolbar__btn ${toolState.toolName === toolName ? "active" : ""}`}
      onClick={() => changeTool(ToolClass, toolName)}
      onMouseDown={(e) => e.target.blur()}
    >
      <span className={`icon ${toolName}`} />
      <span className="tooltip">{toolLabel(toolName, label)}</span>
    </button>
  );

  const renderGroup = (groupKey) => {
    const entries = GROUP_TOOL_ENTRIES[groupKey];
    if (!entries) return null;

    const lastTool = toolState.getLastInGroup(groupKey);
    const labels = toolState.groupLabels[groupKey] || {};
    const tooltip = toolLabel(lastTool, labels[lastTool] || lastTool);

    return (
      <div className="toolbar__group" key={groupKey}>
        <button
          type="button"
          className={`toolbar__btn ${lastTool} ${toolState.isToolInGroup(toolState.toolName, groupKey) ? "active" : ""}`}
          onClick={() => handleGroupClick(groupKey)}
          onMouseDown={(e) => e.target.blur()}
        >
          <span className={`icon ${lastTool}`} />
          <span className="tooltip">{tooltip}</span>
        </button>
        <div className={`toolbar__submenu ${activeGroup === groupKey ? "show" : ""}`}>
          {entries.map(([name, ToolClass, label]) => renderButton(name, ToolClass, label))}
        </div>
      </div>
    );
  };

  const handleActionClick = (action, buttonId) => {
    action();
    setClickAnimation(buttonId);
    setTimeout(() => setClickAnimation(null), 1000);
    setActiveGroup(null);
  };

  const brushProAllowed = capabilitiesState.brushProAllowed;

  return (
    <div className="toolbar" data-nosnippet>
      {renderGroup("brush")}
      {renderGroup("brushExtra")}
      {brushProAllowed && renderGroup("brushPro")}
      {renderGroup("shapes")}
      {renderGroup("color")}

      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn eraser ${toolState.isToolInGroup(toolState.toolName, "eraser") ? "active" : ""}`}
          onClick={() => handleGroupClick("eraser")}
          onMouseDown={(e) => e.target.blur()}
        >
          <span className="icon eraser" />
          <span className="tooltip">{toolLabel("eraser", "Ластик")}</span>
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
        <span className="tooltip">{toolLabel("grid", "Сетка")}</span>
      </button>

      {renderGroup("selection")}
      {renderButton("hand", Hand, "Рука")}

      <button
        type="button"
        className={`toolbar__btn zoom-btn ${clickAnimation === "zoomOut" ? "click-animation" : ""}`}
        onClick={() => handleActionClick(() => canvasState.zoomOut(), "zoomOut")}
        onMouseDown={(e) => e.target.blur()}
        title="Уменьшить"
      >
        <span className="icon minus" />
        <span className="tooltip">Уменьшить (-)</span>
      </button>

      <button
        type="button"
        className={`toolbar__btn zoom-btn ${clickAnimation === "zoomIn" ? "click-animation" : ""}`}
        onClick={() => handleActionClick(() => canvasState.zoomIn(), "zoomIn")}
        onMouseDown={(e) => e.target.blur()}
        title="Увеличить"
      >
        <span className="icon plus" />
        <span className="tooltip">Увеличить (+)</span>
      </button>
    </div>
  );
});

export default Toolbar;
