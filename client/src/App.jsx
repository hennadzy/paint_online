import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <Routes>
        <Route path='/' element={
          <>
            <Toolbar />
            <SettingBar />
            <Canvas />
          </>
        } />
        <Route path='/:id' element={<Canvas />} />
      </Routes>
        // <Routes>
        //     <Route path='/:id' element={
        //         <>
        //             <Toolbar />
        //             <SettingBar />
        //             <Canvas />
        //         </>
        //     } />
        //     <Route path='/' element={
        //         <Navigate to={`f${(+new Date).toString(16)}`} />
        //     }
        //     />
        // </Routes>


    );
};

export default App;
