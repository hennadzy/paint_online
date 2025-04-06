import React from 'react';
import toolState from "../store/toolState";

const SettingBar = () => {
    return (
        <div className="setting-bar">
            <label htmlFor="line-width">Толщина линии:</label>
            <input
                onChange={e => toolState.setLineWidth(e.target.value)}
                style={{margin: '0 10px'}}
                id="line-width"
                type="range"
                defaultValue={1}
                min={1}
                max={50} // Лимит толщины линии от 1 до 50 пикселей
            />
            <span style={{marginLeft: '10px'}}> {toolState.tool?.lineWidth || 1}px </span> {/* Показываем текущую толщину линии */}
        </div>
    );
};

export default SettingBar;