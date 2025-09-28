import React, { useEffect, useState } from 'react';
import toolState from "../store/toolState";
import '../styles/toolbar.scss'


export const SettingBar = () => {
    const [lineWidth, setLineWidth] = useState(1); // ✅ локальное состояние

    useEffect(() => {
        const tool = toolState.tool;
        if (tool) {
            setLineWidth(tool.lineWidth || 1); // ✅ обновляем при смене инструмента
        }
    }, [toolState.tool]);

    const handleChange = (e) => {
        const value = +e.target.value;
        setLineWidth(value);
        if (toolState.tool) {
            toolState.tool.lineWidth = value; // ✅ меняем только локально
        }
    };

    return (
        <div className="line-width-control">
            <span className="line-width-label">Толщина линии:</span>
            <input
                type="range"
                min={1}
                max={50}
                value={lineWidth}
                onChange={handleChange}
            />
            <span className="line-width-value">{lineWidth}px</span>
        </div>
    );
};
export default SettingBar;
