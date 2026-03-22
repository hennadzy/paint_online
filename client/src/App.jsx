import React, { useEffect } from 'react';
import { observer } from "mobx-react-lite";
import "./styles/app.scss"
import "./styles/room-interface.scss"
import "./styles/not-found.scss"
import "./styles/admin.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import NotFoundPage from "./components/NotFoundPage";
import ProfilePage from "./components/ProfilePage";
import AuthPage from "./components/AuthPage";
import AdminPage from "./components/AdminPage";
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";
import userState from "./store/userState";
import WebSocketService from "./services/WebSocketService";

const isValidRoomId = (id) => /^[a-zA-Z0-9]{9}$/.test(id);

const RoomRoute = () => {
    const { id } = useParams();
    if (!id || !isValidRoomId(id)) {
        return <Navigate to="/404" replace />;
    }
    return <Canvas />;
};

const App = observer(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const hideGlobalUI = ['/profile', '/login', '/register', '/admin'].includes(location.pathname);

    // Глобальный слушатель личных сообщений — активен всегда пока приложение открыто
    useEffect(() => {
        const handlePersonalMessage = (data) => {
            userState.addIncomingPersonalMessage(data);
        };
        WebSocketService.on('personalMessage', handlePersonalMessage);
        return () => WebSocketService.off('personalMessage', handlePersonalMessage);
    }, []);

    useEffect(() => {
        const fallback = document.getElementById('server-404-fallback');
        if (fallback) fallback.hidden = true;

        const path = location.pathname;
        const allowedClientPaths = ['/', '/login', '/register', '/profile', '/404', '/admin'];
        if (allowedClientPaths.includes(path)) return;

        const segments = path.slice(1).split('/').filter(Boolean);
        if (segments.length !== 1) {
            navigate('/404', { replace: true });
            return;
        }
        if (!isValidRoomId(segments[0])) {
            navigate('/404', { replace: true });
        }
    }, [location.pathname, navigate]);

    if (location.pathname === '/404') {
        return <NotFoundPage />;
    }

    const isAdminPage = location.pathname === '/admin';
    
    return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            {!hideGlobalUI && <TopMenu />}
            {!hideGlobalUI && <Toolbar />}
            {!hideGlobalUI && <SettingBar />}
            <div className={`main-content ${isAdminPage ? 'main-content--admin' : ''}`}>
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/login' element={<AuthPage />} />
                    <Route path='/register' element={<AuthPage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    <Route path='/admin' element={<AdminPage />} />
                    <Route path='/:id' element={<RoomRoute />} />
                    <Route path='*' element={<Navigate to="/404" replace />} />
                </Routes>
            </div>
        </div>
    );
});

export default App;
