import React from 'react';
import { observer } from 'mobx-react-lite';
import toolState from '../store/toolState';
import '../styles/toolbar.scss';

export const SettingBar = observer(() => {
  const tool = toolState.tool;
  const lineWidth = tool?.lineWidth || 1;

  const handleChange = (e) => {
    const value = +e.target.value;
    if (tool) {
      tool.lineWidth = value;
    }
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
});

export default SettingBar;
