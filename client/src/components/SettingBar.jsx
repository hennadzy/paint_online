import React from "react";
import toolState from "../store/toolState";

const SettingBar = () => {
  const changeLineWidth = (e) => {
    const newWidth = +e.target.value;
    toolState.setLineWidth(newWidth);
  };

  return (
    <div className="settings-bar">
      <label htmlFor="line-width">Толщина линии</label>
      <input
        id="line-width"
        type="range"
        min={1}
        max={50}
        value={toolState.getCurrentLineWidth()}
        onChange={changeLineWidth}
      />
      <span style={{ marginLeft: 10 }}>{toolState.getCurrentLineWidth()}px</span>
    </div>
  );
};

export default SettingBar;
