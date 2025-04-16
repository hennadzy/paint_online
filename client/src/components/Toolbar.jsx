import React from 'react';
import '../styles/toolbar.scss'
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import canvasState from "../store/canvasState";
import Rect from "../tools/Rect";
import Line from "../tools/Line";
import Circle from "../tools/Circle";
import Eraser from "../tools/Eraser";

const Toolbar = () => {

    const changeColor = (e) => {
        // Изменяем локальный цвет только для текущего инструмента
        if (toolState.tool) {
            toolState.tool.fillColor = e.target.value;
            toolState.tool.strokeColor = e.target.value;
        }
    };
    
    const changeTool = (tool, cursorClass) => {
        toolState.setTool(tool);
        
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
        const dataUrl = canvasState.canvas.toDataURL()
        console.log(dataUrl)
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = canvasState.sessionid + ".jpg"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    return (
        <div className="toolbar">
            <button className="toolbar__btn brush" onClick={() => changeTool(new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionid), "brush-cursor")}/> 
            <button className="toolbar__btn rect" onClick={() => changeTool(new Rect(canvasState.canvas, canvasState.socket, canvasState.sessionid), "rect-cursor")}/>
            <button className="toolbar__btn circle" onClick={() => changeTool(new Circle(canvasState.canvas, canvasState.socket, canvasState.sessionid), "circle-cursor")}/>
            <button className="toolbar__btn eraser" onClick={() => changeTool(new Eraser(canvasState.canvas, canvasState.socket, canvasState.sessionid), "eraser-cursor")}/>
            <button className="toolbar__btn line" onClick={() => changeTool(new Line(canvasState.canvas, canvasState.socket, canvasState.sessionid), "line-cursor")}/>
            <input onChange={e => changeColor(e)} style={{marginLeft:10}} type="color"/>
            <button className="toolbar__btn undo" onClick={() => canvasState.undo()}/>
            <button className="toolbar__btn redo" onClick={() => canvasState.redo()}/>
            <button className="toolbar__btn save" onClick={() => download()}/>
        </div>
    );
};

export default Toolbar;
