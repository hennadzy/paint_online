import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import { Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <div className="app">
            <TopMenu />
            <div className="main-content">
                <Routes>
                    <Route path='/' element={
                        <>
                            <Toolbar />
                            <SettingBar />
                            <Canvas />
                        </>
                    } />
                    <Route path='/:id' element={
                        <>
                            <Toolbar />
                            <SettingBar />
                            <Canvas />
                        </>
                    } />
                </Routes>
            </div>
            <div className="room-info">
                <button className="room-create-btn" onClick={() => {
                    const canvasComponent = document.querySelector('.canvas');
                    if (canvasComponent) {
                        const event = new Event('createRoom');
                        canvasComponent.dispatchEvent(event);
                    }
                }}>
                    Создать комнату
                </button>
                <div id="user-messages"></div>
            </div>
        </div>
    );
};

export default App;