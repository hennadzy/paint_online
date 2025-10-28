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
            <div className="room-info" style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <button className="toolbar__btn" onClick={() => {
                    const canvas = document.querySelector('.canvas');
                    const button = canvas.querySelector('button');
                    if (button) button.click();
                }} style={{ marginBottom: '10px' }}>
                    Создать комнату
                </button>
                <div id="user-messages" style={{ color: '#fff', fontSize: '14px', textAlign: 'right' }}></div>
            </div>
        </div>
    );
};

export default App;