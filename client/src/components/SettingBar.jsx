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

  const renderExtraParam = () => {
    switch (currentToolName) {
      case 'marker':
        return (
          <>
            <span className="param-label">Угол</span>
            <input
              type="range"
              min={0}
              max={180}
              value={params.angle ?? 0}
              onChange={(e) => handleParamChange('angle', +e.target.value)}
            />
            <span className="param-value">{params.angle ?? 0}°</span>
          </>
        );
      case 'airbrush':
        return (
          <>
            <span className="param-label">Разброс</span>
            <input
              type="range"
              min={5}
              max={40}
              value={params.scatter ?? 15}
              onChange={(e) => handleParamChange('scatter', +e.target.value)}
            />
            <span className="param-value">{params.scatter ?? 15}px</span>
          </>
        );
      case 'smudge':
        return (
          <>
            <span className="param-label">Сила</span>
            <input
              type="range"
              min={10}
              max={100}
              value={params.strength ?? 50}
              onChange={(e) => handleParamChange('strength', +e.target.value)}
            />
            <span className="param-value">{params.strength ?? 50}%</span>
          </>
        );
      case 'watercolor':
        return (
          <>
            <span className="param-label">Насыщ.</span>
            <input
              type="range"
              min={0}
              max={100}
              value={params.saturation ?? 50}
              onChange={(e) => handleParamChange('saturation', +e.target.value)}
            />
            <span className="param-value">{params.saturation ?? 50}%</span>
          </>
        );
      case 'oil':
        return (
          <>
            <span className="param-label">Край</span>
            <input
              type="range"
              min={0}
              max={100}
              value={params.edgeHardness ?? 70}
              onChange={(e) => handleParamChange('edgeHardness', +e.target.value)}
            />
            <span className="param-value">{params.edgeHardness ?? 70}%</span>
          </>
        );
      case 'pastel':
        return (
          <>
            <span className="param-label">Зерн.</span>
            <input
              type="range"
              min={0}
              max={100}
              value={params.graininess ?? 60}
              onChange={(e) => handleParamChange('graininess', +e.target.value)}
            />
            <span className="param-value">{params.graininess ?? 60}%</span>
          </>
        );
      case 'calligraphy':
        return (
          <>
            <span className="param-label">Скорость</span>
            <input
              type="range"
              min={0}
              max={100}
              value={params.speedSensitivity ?? 50}
              onChange={(e) => handleParamChange('speedSensitivity', +e.target.value)}
            />
            <span className="param-value">{params.speedSensitivity ?? 50}%</span>
          </>
        );
      default:
        return null;
    }
  };

  const showOpacity = !isStampTool && !['smudge'].includes(currentToolName);
  const showColor = !isStampTool;
  const extraParam = renderExtraParam();
  const widthLabel = isStampTool ? 'Размер' : 'Толщина';

  return (
    <>
      <div className="setting-bar" data-nosnippet>
        <div className="setting-row">
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
          <span className="line-width-label">{widthLabel}: {lineWidth}px</span>
          {showOpacity && (
            <>
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
              <span className="opacity-label">{Math.round(toolState.strokeOpacity * 100)}%</span>
            </>
          )}
          {extraParam}
          {showColor && (
            <input
              type="color"
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
