import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <div className="app">
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

        </div>
    );
};

export default App;