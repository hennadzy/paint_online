import React from "react";
import { observer } from "mobx-react-lite";
import toolState from "../store/toolState";

const SettingBar = observer(() => {
  const handleChange = (e) => {
    const value = +e.target.value;
    toolState.setLineWidth(value);
  };

  const currentToolName = toolState.toolName;
  const currentWidth = currentToolName ? toolState.lineWidths[currentToolName] : 1;

  return (
    <div className="setting-bar">
      <label htmlFor="line-width">Толщина линии</label>
      <input
        id="line-width"
        type="number"
        min={1}
        max={50}
        value={currentWidth}
        onChange={handleChange}
      />
    </div>
  );
});

export default SettingBar;
