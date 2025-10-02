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
      <input
        type="range"
        min={1}
        max={50}
        value={lineWidth}
        onChange={handleChange}
      />
      <span className="line-width-label">{lineWidth}px</span>
    </div>
  );

});

export default SettingBar;
