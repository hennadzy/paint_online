import React from 'react';
import canvasState from '../store/canvasState';

const SettingBar = () => {
  const changeLineWidth = e => {
    const width = +e.target.value;
    if (canvasState.tool) {
      canvasState.tool.setLineWidth(width);
    }
  };

  return (
    <div className="setting-bar">
      <label htmlFor="line-width">Толщина линии: {canvasState.tool?.lineWidth || 1}px</label>
      <input
        id="line-width"
        type="range"
        min={1}
        max={50}
        value={canvasState.tool?.lineWidth || 1}
        onChange={changeLineWidth}
      />
    </div>
  );
};

export default SettingBar;
