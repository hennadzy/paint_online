import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import canvasState from "./store/canvasState";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <div className="app">
            <Toolbar />
            <div className="top-menu">
                <div className="top-menu__actions">
                    <button className="toolbar__btn undo" onClick={() => canvasState.undo()} />
                    <button className="toolbar__btn redo" onClick={() => canvasState.redo()} />
                    <button className="toolbar__btn save" onClick={() => {
                        const dataUrl = canvasState.canvas.toDataURL();
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = canvasState.sessionid + ".jpg";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }} />
                </div>
                <SettingBar />
            </div>
            <div className="main-content">
                <Canvas />
            </div>
        </div>
    );
};

export default App;