import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import toolState from "../store/toolState";
import StampPalette from "./StampPalette";

const SettingBar = observer(() => {
  const inputRef = useRef(null);
  const opacityInputRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isOpacityDraggingRef = useRef(false);

  const handleChange = (e) => {
    toolState.setLineWidth(+e.target.value);
  };

  const handleOpacityChange = (e) => {
    toolState.setStrokeOpacity(+e.target.value);
  };

  const handleParamChange = (key, value) => {
    if (toolState.toolName) {
      toolState.setToolParam(toolState.toolName, key, value);
    }
  };

  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    e.stopPropagation();
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const { min, max } = input;
    const value = Math.round(+min + (x / rect.width) * (+max - +min));
    toolState.setLineWidth(Math.max(+min, Math.min(+max, value)));
  };

  const handleTouchEnd = (e) => {
    isDraggingRef.current = false;
    e.stopPropagation();
  };

  const handleOpacityTouchStart = (e) => {
    isOpacityDraggingRef.current = true;
    e.stopPropagation();
  };

  const handleOpacityTouchMove = (e) => {
    if (!isOpacityDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const input = opacityInputRef.current;
    const rect = input.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const { min, max } = input;
    const value = Math.round((+min + (x / rect.width) * (+max - +min)) * 100) / 100;
    toolState.setStrokeOpacity(Math.max(+min, Math.min(+max, value)));
  };

  const handleOpacityTouchEnd = (e) => {
    isOpacityDraggingRef.current = false;
    e.stopPropagation();
  };

  const lineWidth = toolState.tool?.lineWidth ?? 1;
  const currentToolName = toolState.toolName;
  const currentWidth = currentToolName ? toolState.lineWidths[currentToolName] : 1;
  const params = currentToolName ? toolState.getToolParams(currentToolName) : {};

  const isFillTool = currentToolName === 'fill';
  const isStampTool = currentToolName === 'stamp';
  const colorValue = isFillTool ? toolState.fillColor : toolState.strokeColor;
  const setColor = isFillTool ? toolState.setFillColor.bind(toolState) : toolState.setStrokeColor.bind(toolState);

  const extraParamDefs = {
    marker: { label: 'Угол', key: 'angle', min: 0, max: 180, suffix: '°', default: 0 },
    airbrush: { label: 'Разброс', key: 'scatter', min: 5, max: 40, suffix: 'px', default: 15 },
    smudge: { label: 'Сила', key: 'strength', min: 10, max: 100, suffix: '%', default: 50 },
    watercolor: { label: 'Насыщ.', key: 'saturation', min: 0, max: 100, suffix: '%', default: 50 },
    oil: { label: 'Край', key: 'edgeHardness', min: 0, max: 100, suffix: '%', default: 70 },
    pastel: { label: 'Зерн.', key: 'graininess', min: 0, max: 100, suffix: '%', default: 60 },
    calligraphy: { label: 'Скорость', key: 'speedSensitivity', min: 0, max: 100, suffix: '%', default: 50 },
  };

  const extraDef = extraParamDefs[currentToolName];
  const showOpacity = !['smudge'].includes(currentToolName);
  const showColor = !isStampTool;
  const sliderCount = 1 + (showOpacity ? 1 : 0) + (extraDef ? 1 : 0);
  const multiRowClass = sliderCount > 2 ? 'setting-bar--multi-row' : '';
  const widthLabel = isStampTool ? 'Размер' : 'Толщина';

  return (
    <>
      <div className={`setting-bar ${multiRowClass}`} data-nosnippet>
        <div className="setting-row">
          <div className="setting-slider-group setting-slider-group--width">
            <input
              ref={inputRef}
              id="line-width"
              type="range"
              min={isStampTool ? 16 : 1}
              max={isStampTool ? 200 : 50}
              value={currentWidth}
              onChange={handleChange}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            <span className="line-width-label">
              <span className="setting-label-text">{widthLabel}: </span>
              {' '}{lineWidth}px
            </span>
          </div>

          {showOpacity && (
            <div className="setting-slider-group setting-slider-group--opacity">
              <input
                ref={opacityInputRef}
                id="stroke-opacity"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={toolState.strokeOpacity}
                onChange={handleOpacityChange}
                onTouchStart={handleOpacityTouchStart}
                onTouchMove={handleOpacityTouchMove}
                onTouchEnd={handleOpacityTouchEnd}
              />
              <span className="opacity-label">
                <span className="setting-label-text">Прозрачность: </span>
                {' '}{Math.round(toolState.strokeOpacity * 100)}%
              </span>
            </div>
          )}

          {extraDef && (
            <div className="setting-slider-group setting-slider-group--param">
              <input
                type="range"
                min={extraDef.min}
                max={extraDef.max}
                value={params[extraDef.key] ?? extraDef.default}
                onChange={(e) => handleParamChange(extraDef.key, +e.target.value)}
              />
              <span className="param-label">{extraDef.label}: </span>
              <span className="param-value">
                {' '}{params[extraDef.key] ?? extraDef.default}{extraDef.suffix}
              </span>
            </div>
          )}

          {showColor && (
            <input
              type="color"
              className="setting-color-input"
              value={colorValue}
              onChange={(e) => setColor(e.target.value)}
            />
          )}
        </div>
      </div>
      <StampPalette />
    </>
  );
});

export default SettingBar;
