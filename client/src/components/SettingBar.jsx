import React, { useEffect, useState } from 'react';
import toolState from '../store/toolState';
import '../styles/toolbar.scss';

export const SettingBar = () => {
  const [lineWidth, setLineWidth] = useState(1);

  useEffect(() => {
    const tool = toolState.tool;
    if (tool && typeof tool.lineWidth === 'number') {
      setLineWidth(tool.lineWidth);
    }
  }, [toolState.tool]);

  const handleChange = (e) => {
    const value = +e.target.value;
    setLineWidth(value);
    toolState.setLineWidth(value); // сохраняем в toolState
  };

  return (
    <div className="setting-bar">
      <label>Толщина линии:</label>
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
};

export default SettingBar;
