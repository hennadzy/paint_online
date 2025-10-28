
import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import toolState from "../store/toolState";

const SettingBar = observer(() => {
  const inputRef = useRef(null);
  const opacityInputRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isOpacityDraggingRef = useRef(false);

  const handleChange = (e) => {
    const value = +e.target.value;
    toolState.setLineWidth(value);
  };

  const handleOpacityChange = (e) => {
    const value = +e.target.value;
    toolState.setStrokeOpacity(value);
  };

  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    // Prevent canvas from interfering
    e.stopPropagation();
  };

  const handleTouchMove = (e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      // Calculate value based on touch position
      const input = inputRef.current;
      const rect = input.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const width = rect.width;
      const min = +input.min;
      const max = +input.max;
      const value = Math.round(min + (x / width) * (max - min));
      const clampedValue = Math.max(min, Math.min(max, value));
      toolState.setLineWidth(clampedValue);
      input.value = clampedValue;
    }
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
    if (isOpacityDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const input = opacityInputRef.current;
      const rect = input.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const width = rect.width;
      const min = +input.min;
      const max = +input.max;
      const value = Math.round((min + (x / width) * (max - min)) * 100) / 100;
      const clampedValue = Math.max(min, Math.min(max, value));
      toolState.setStrokeOpacity(clampedValue);
      input.value = clampedValue;
    }
  };

  const handleOpacityTouchEnd = (e) => {
    isOpacityDraggingRef.current = false;
    e.stopPropagation();
  };

  const lineWidth = toolState.tool?.lineWidth ?? 1;
  const currentToolName = toolState.toolName;
  const currentWidth = currentToolName ? toolState.lineWidths[currentToolName] : 1;

  return (
    <div className="setting-bar">
      <div className="setting-row">
        <input
          ref={inputRef}
          id="line-width"
          type="range"
          min={1}
          max={50}
          value={currentWidth}
          onChange={handleChange}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <span className="line-width-label">{lineWidth}px</span>
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
        <input
          type="color"
          value={toolState.strokeColor}
          onChange={(e) => toolState.setStrokeColor(e.target.value)}
        />
      </div>
    </div>
  );
});

export default SettingBar;



