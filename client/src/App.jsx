import React from 'react';
import { observer } from "mobx-react-lite";
import "./styles/app.scss"
import "./styles/room-interface.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import { Routes, Route } from 'react-router-dom';
import canvasState from "./store/canvasState";

const App = observer(() => {

    return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            <TopMenu />
            <Toolbar />
            <SettingBar />
            <div className="main-content">
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/:id' element={<Canvas />} />
                </Routes>
            </div>
        </div>
    );
});

export default App;
