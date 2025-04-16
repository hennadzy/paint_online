import React from 'react';
import toolState from "../store/toolState";
import '../styles/toolbar.scss'

const SettingBar = () => {
    const handleLineWidthChange = (e) => {
        const newLineWidth = parseInt(e.target.value, 10); 
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
                value={toolState.tool?.lineWidth || 3} 
                min={1}
                max={50}
            />
            <span style={{ marginLeft: '10px' }}>
                {toolState.tool?.lineWidth || 3}px 
            </span>
        </div>
    );
};
export default SettingBar;