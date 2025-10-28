import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import canvasState from "./store/canvasState";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={
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
                        <div className="room-info" style={{ position: 'absolute', top: '110px', left: '620px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 'calc(100vw - 630px)' }}>
                            <button className="toolbar__btn room-create-btn" onClick={() => {
                                const canvas = document.querySelector('.canvas');
                                const button = canvas.querySelector('button');
                                if (button) button.click();
                            }} style={{ marginBottom: '10px', padding: '5px 10px', fontSize: '12px', whiteSpace: 'nowrap', width: 'auto', minWidth: '120px' }}>
                                Создать комнату
                            </button>
                            <div id="user-messages" style={{ color: '#fff', fontSize: '12px', textAlign: 'left', maxWidth: '100%', wordWrap: 'break-word' }}></div>
                        </div>
                    </div>
                } />
                <Route path='/:id' element={
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
                        <div className="room-info" style={{ position: 'absolute', top: '110px', left: '620px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 'calc(100vw - 630px)' }}>
                            <button className="toolbar__btn room-create-btn" onClick={() => {
                                const canvas = document.querySelector('.canvas');
                                const button = canvas.querySelector('button');
                                if (button) button.click();
                            }} style={{ marginBottom: '10px', padding: '5px 10px', fontSize: '12px', whiteSpace: 'nowrap', width: 'auto', minWidth: '120px' }}>
                                Создать комнату
                            </button>
                            <div id="user-messages" style={{ color: '#fff', fontSize: '12px', textAlign: 'left', maxWidth: '100%', wordWrap: 'break-word' }}></div>
                        </div>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    );
};

export default App;