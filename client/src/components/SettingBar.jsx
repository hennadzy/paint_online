import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import toolState from "../store/toolState";
import StampPalette from "./StampPalette";

const TOOL_EXTRA_PARAMS = {
  marker: [
    { type: 'range', label: 'Угол', key: 'angle', min: 0, max: 180, suffix: '°', default: 0 },
  ],
  airbrush: [
    { type: 'range', label: 'Разброс', key: 'scatter', min: 5, max: 40, suffix: 'px', default: 15 },
  ],
  smudge: [
    { type: 'range', label: 'Сила', key: 'strength', min: 10, max: 100, suffix: '%', default: 50 },
  ],
  watercolor: [
    { type: 'range', label: 'Насыщ.', key: 'saturation', min: 0, max: 100, suffix: '%', default: 50 },
    { type: 'toggle', label: 'Текстура', key: 'texture', default: true },
  ],
  oil: [
    { type: 'range', label: 'Край', key: 'edgeHardness', min: 0, max: 100, suffix: '%', default: 70 },
  ],
  pastel: [
    { type: 'range', label: 'Зерн.', key: 'graininess', min: 0, max: 100, suffix: '%', default: 60 },
    { type: 'range', label: 'Угол', key: 'angle', min: 0, max: 180, suffix: '°', default: 0 },
  ],
  calligraphy: [
    { type: 'range', label: 'Скорость', key: 'speedSensitivity', min: 0, max: 100, suffix: '%', default: 50 },
    { type: 'range', label: 'Угол', key: 'angleSensitivity', min: 0, max: 100, suffix: '%', default: 50 },
  ],
};

const PRESSURE_TOOLS = new Set([
  'brush', 'marker', 'airbrush', 'smudge', 'watercolor', 'oil', 'pastel', 'calligraphy', 'eraser',
]);

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

  const extraParams = TOOL_EXTRA_PARAMS[currentToolName] || [];
  const showPressure = PRESSURE_TOOLS.has(currentToolName);
  const showOpacity = !['smudge'].includes(currentToolName);
  const showColor = !isStampTool;
  const rangeSliderCount = extraParams.filter((p) => p.type === 'range').length;
  const sliderCount = 1 + (showOpacity ? 1 : 0) + rangeSliderCount;
  const multiRow = sliderCount > 2;
  const widthLabel = isStampTool ? 'Размер' : 'Толщина';

  const renderRangeGroup = (def, className = 'setting-slider-group--param') => (
    <div key={def.key} className={`setting-slider-group ${className}`}>
      <div className="setting-slider-row">
        <div className="setting-slider-col">
          <input
            type="range"
            min={def.min}
            max={def.max}
            value={params[def.key] ?? def.default}
            onChange={(e) => handleParamChange(def.key, +e.target.value)}
          />
          <span className="setting-caption">{def.label}</span>
        </div>
        <span className="setting-value">
          {params[def.key] ?? def.default}{def.suffix}
        </span>
      </div>
    </div>
  );

  const renderToggle = (def) => (
    <label key={def.key} className="setting-toggle">
      <input
        type="checkbox"
        checked={params[def.key] ?? def.default}
        onChange={(e) => handleParamChange(def.key, e.target.checked)}
      />
      <span className="setting-toggle__label">{def.label}</span>
    </label>
  );

  const renderExtras = () => extraParams.map((def) => (
    def.type === 'toggle' ? renderToggle(def) : renderRangeGroup(def)
  ));

  const renderPressureToggle = () => showPressure && (
    <label className="setting-toggle">
      <input
        type="checkbox"
        checked={toolState.pressureSensitivity}
        onChange={(e) => toolState.setPressureSensitivity(e.target.checked)}
      />
      <span className="setting-toggle__label">Сила нажатия</span>
    </label>
  );

  const colorInput = showColor && (
    <input
      type="color"
      className="setting-color-input"
      value={colorValue}
      onChange={(e) => setColor(e.target.value)}
    />
  );

  return (
    <>
      <div className={`setting-bar ${multiRow ? 'setting-bar--multi-row' : ''}`} data-nosnippet>
        <div className="setting-row">
          <div className="setting-slider-group setting-slider-group--width">
            <div className="setting-slider-row">
              <div className="setting-slider-col">
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
                <span className="setting-caption">{widthLabel}</span>
              </div>
              <span className="setting-value">{lineWidth}px</span>
            </div>
          </div>

          {showOpacity && (
            <div className="setting-slider-group setting-slider-group--opacity">
              <div className="setting-slider-row">
                <div className="setting-slider-col">
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
                  <span className="setting-caption">Прозрачность</span>
                </div>
                <span className="setting-value">{Math.round(toolState.strokeOpacity * 100)}%</span>
              </div>
            </div>
          )}

          {!multiRow && renderExtras()}
          {!multiRow && renderPressureToggle()}
          {!multiRow && colorInput}

          {multiRow && (
            <div className="setting-desktop-cluster">
              {renderExtras()}
              {renderPressureToggle()}
              {colorInput}
            </div>
          )}
        </div>

        {multiRow && (
          <div className="setting-row setting-row--mobile-extra">
            {renderExtras()}
            {renderPressureToggle()}
            {colorInput}
          </div>
        )}
      </div>
      <StampPalette />
    </>
  );
});

export default SettingBar;
