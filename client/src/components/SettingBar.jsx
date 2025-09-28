import React, { useEffect, useState } from 'react';
import toolState from "../store/toolState";
import '../styles/toolbar.scss'


const SettingBar = () => {
  const changeLineWidth = (e) => {
    const newWidth = +e.target.value;
    if (toolState.tool instanceof Eraser) {
      toolState.setEraserWidth(newWidth);
    } else {
      toolState.setLineWidth(newWidth);
    }
    if (toolState.tool) {
      toolState.tool.lineWidth = newWidth;
    }
  };

  const currentWidth = toolState.tool instanceof Eraser
    ? toolState.eraserWidth
    : toolState.lineWidth;

  return (
    <div className="settings-bar">
      <label htmlFor="line-width">Толщина линии</label>
      <input
        id="line-width"
        type="range"
        min={1}
        max={50}
        value={currentWidth}
        onChange={changeLineWidth}
      />
      <span style={{ marginLeft: 10 }}>{currentWidth}px</span>
    </div>
  );
};
export default SettingBar;
