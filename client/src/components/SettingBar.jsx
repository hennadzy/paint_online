import React from 'react';
import { observer } from 'mobx-react-lite';
import toolState from '../store/toolState';
import '../styles/toolbar.scss';

export const SettingBar = observer(() => {
  const lineWidth = toolState.tool?.lineWidth ?? 1;

  const handleChange = (e) => {
    const value = +e.target.value;
    toolState.setLineWidth(value); // сохраняем в toolState
  };

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
