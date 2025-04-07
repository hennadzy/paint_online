import React from 'react';
import toolState from "../store/toolState";
import '../styles/toolbar.scss'

const SettingBar = () => {
    const handleLineWidthChange = (e) => {
        const newLineWidth = e.target.value;
        toolState.setLineWidth(newLineWidth); // Обновляем значение в toolState
    };

    return (
        <div className="setting-bar">
            <label htmlFor="line-width">Толщина линии:</label>
            <input
                onChange={handleLineWidthChange}
                style={{ margin: '0 10px' }}
                id="line-width"
                type="range"
                defaultValue={toolState.tool?.lineWidth || 3} // Устанавливаем значение по умолчанию
                min={1}
                max={50}
            />
            <span style={{ marginLeft: '10px' }}>
                {toolState.tool?.lineWidth || 3}px {/* Отображение текущего значения из состояния инструмента */}
            </span>
        </div>
    );
};
export default SettingBar;
