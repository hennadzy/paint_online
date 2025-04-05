import React from 'react';
import "./styles/app.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path='/' element={
                    <>
                        <Toolbar />
                        <SettingBar />
                        <Canvas />
                    </>
                } />
                <Route path='/:id'>
                    <Route path="home" />
                </Route>
            </Routes>
        </Router>
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

// export default App;

// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Toolbar from './components/Toolbar';
// import SettingBar from './components/SettingBar';
// import Canvas from './components/Canvas';

// const App = () => {
//     const generateUniquePath = () => {
//         return (+new Date()).toString(16);
//     };

//     return (
//         <Router>
//             <Routes>
//                 <Route path='/:id' element={
//                     <>
//                         <Toolbar />
//                         <SettingBar />
//                         <Canvas />
//                     </>
//                 } />

//                 <Route path='/' element={<Navigate to={`/${generateUniquePath()}`} replace />} />
//             </Routes>
//         </Router>
//     );
// };

export default App;