import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <div className="app">
            <Toolbar />
            <div className="main-content">
                <SettingBar />
                <Canvas />
            </div>
        </div>
    );
};

export default App;