import React from 'react';
import { observer } from "mobx-react-lite";
import "./styles/app.scss"
import "./styles/room-interface.scss"
import "./styles/not-found.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import NotFoundPage from "./components/NotFoundPage";
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";

const App = observer(() => {
    const location = useLocation();

    if (location.pathname === '/404') {
        return <NotFoundPage />;
    }

    return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            <TopMenu />
            <Toolbar />
            <SettingBar />
            <div className="main-content">
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/:id' element={<Canvas />} />
                    <Route path='*' element={<Navigate to="/404" replace />} />
                </Routes>
            </div>
        </div>
    );
});

export default App;
