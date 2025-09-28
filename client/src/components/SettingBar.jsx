import React from "react";
import { observer } from "mobx-react-lite";
import toolState from "../store/toolState";
import "../styles/toolbar.scss";

const SettingBar = observer(() => {
  const handleLineWidthChange = (e) => {
    const newLineWidth = parseInt(e.target.value, 10);
    toolState.setLineWidth(newLineWidth);
  };

  return (
    <div className="setting-bar">
      <label htmlFor="line-width">Толщина линии:</label>
      <input
        id="line-width"
        type="range"
        min={1}
        max={50}
        value={toolState.tool?.lineWidth || 1}
        onChange={handleLineWidthChange}
      />
      <span>{toolState.tool?.lineWidth || 1}px</span>
    </div>
  );
});

export default SettingBar;
