import React from 'react';
import { observer } from "mobx-react-lite";
import '../styles/toolbar.scss';
import toolState from "../store/toolState";
import canvasState from "../store/canvasState";
import Brush from "../tools/Brush";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Eraser from "../tools/Eraser";

const Toolbar = observer(() => {
  const changeColor = (e) => {
    const newColor = e.target.value;
    toolState.setStrokeColor(newColor);
  };

  const changeTool = (tool, cursorClass, toolNameOverride) => {
    toolState.setTool(tool, toolNameOverride);

    const canvas = canvasState.canvas;
    if (canvas) {
      canvas.classList.remove(
        "brush-cursor",
        "eraser-cursor",
        "rect-cursor",
        "circle-cursor",
        "line-cursor"
      );
      canvas.classList.add(cursorClass);
    }
  };

  const download = () => {
    const dataUrl = canvasState.canvas.toDataURL();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = canvasState.sessionid + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="toolbar">
      <button
        className="toolbar__btn brush"
        onClick={() =>
          changeTool(
            new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionid),
            "brush-cursor", "brush"
          )
        }
      />
      <button
        className="toolbar__btn rect"
        onClick={() =>
          changeTool(
            new Rect(canvasState.canvas, canvasState.socket, canvasState.sessionid),
            "rect-cursor", "rect"
          )
        }
      />
      <button
        className="toolbar__btn circle"
        onClick={() =>
          changeTool(
            new Circle(canvasState.canvas, canvasState.socket, canvasState.sessionid),
            "circle-cursor", "circle"
          )
        }
      />
      <button
        className="toolbar__btn eraser"
        onClick={() =>
          changeTool(
            new Eraser(canvasState.canvas, canvasState.socket, canvasState.sessionid),
            "eraser-cursor", "eraser"
          )
        }
      />
      <button
        className="toolbar__btn line"
        onClick={() =>
          changeTool(
            new Line(canvasState.canvas, canvasState.socket, canvasState.sessionid),
            "line-cursor", "line"
          )
        }
      />
      <input
        type="color"
        value={toolState.strokeColor}
        onChange={changeColor}
        style={{ marginLeft: 10 }}
      />
      <button className="toolbar__btn undo" onClick={() => canvasState.undo()} />
      <button className="toolbar__btn redo" onClick={() => canvasState.redo()} />
      <button className="toolbar__btn save" onClick={download} />
    </div>
  );
});

export default Toolbar;
