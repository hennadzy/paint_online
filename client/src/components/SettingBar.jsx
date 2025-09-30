import React, { useState } from 'react';
import { autorun } from 'mobx';
import toolState from '../store/toolState';
import '../styles/toolbar.scss';

export const SettingBar = () => {
  const [lineWidth, setLineWidth] = useState(1);

  // реактивно отслеживаем смену инструмента и обновляем ползунок
  autorun(() => {
    const tool = toolState.tool;
    if (tool && typeof tool.lineWidth === 'number') {
      setLineWidth(tool.lineWidth);
    }
  });

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
