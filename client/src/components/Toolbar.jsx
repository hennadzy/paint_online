import React from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import Rect from '../tools/Rect';
import Circle from '../tools/Circle';
import Eraser from '../tools/Eraser';
import Line from '../tools/Line';

const Toolbar = () => {
  const changeColor = e => {
    toolState.setStrokeColor(e.target.value);
    toolState.setFillColor(e.target.value);
  };

  const changeLineWidth = e => {
    const width = +e.target.value;
    if (canvasState.tool) {
      canvasState.tool.setLineWidth(width);
    }
  };

  return (
    <div className="toolbar">
      <button className="toolbar__btn brush" onClick={() => toolState.setTool(new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionId))} />
      <button className="toolbar__btn rect" onClick={() => toolState.setTool(new Rect(canvasState.canvas, canvasState.socket, canvasState.sessionId))} />
      <button className="toolbar__btn circle" onClick={() => toolState.setTool(new Circle(canvasState.canvas, canvasState.socket, canvasState.sessionId))} />
      <button className="toolbar__btn eraser" onClick={() => toolState.setTool(new Eraser(canvasState.canvas, canvasState.socket, canvasState.sessionId))} />
      <button className="toolbar__btn line" onClick={() => toolState.setTool(new Line(canvasState.canvas, canvasState.socket, canvasState.sessionId))} />
      <input type="color" onChange={changeColor} />
      <div className="toolbar__slider">
        <label htmlFor="line-width">Толщина: {canvasState.tool?.lineWidth || 1}px</label>
        <input
          id="line-width"
          type="range"
          min={1}
          max={50}
          value={canvasState.tool?.lineWidth || 1}
          onChange={changeLineWidth}
        />
      </div>
    </div>
  );
};

export default Toolbar;
