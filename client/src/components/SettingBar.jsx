import React, { useEffect, useState } from 'react';
import toolState from "../store/toolState";
import '../styles/toolbar.scss'

const SettingBar = observer(() => {
    const [lineWidth, setLineWidth] = useState(toolState.tool?.lineWidth || 1);

    useEffect(() => {
        if (toolState.tool) {
            setLineWidth(toolState.tool.lineWidth);
        }
    }, [toolState.tool]);

    const handleLineWidthChange = (e) => {
        const newLineWidth = parseInt(e.target.value, 10);
        setLineWidth(newLineWidth);
        toolState.setLineWidth(newLineWidth);
    };

    return (
        <div className="setting-bar">
            <label htmlFor="line-width">Толщина линии:</label>
            <input
                onChange={handleLineWidthChange}
                style={{ margin: '0 10px' }}
                id="line-width"
                type="range"
                value={lineWidth}
                min={1}
                max={50}
            />
            <span style={{ marginLeft: '10px' }}>
                {lineWidth}px
            </span>
        </div>
    );
});
export default SettingBar;