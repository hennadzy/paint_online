import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Toolbar from './components/Toolbar';
import SettingBar from './components/SettingBar';
import Canvas from './components/Canvas';

const App = () => {
    const generateUniquePath = () => {
        return (+new Date()).toString(16);
    };

    return (
        <Router>
            <Routes>
                <Route path='/:id' element={
                    <>
                        <Toolbar />
                        <SettingBar />
                        <Canvas />
                    </>
                } />

                <Route path='/' element={<Navigate to={`/${generateUniquePath()}`} replace />} />
            </Routes>
        </Router>
    );
};

export default App;