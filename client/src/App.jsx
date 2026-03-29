import React, { useEffect } from 'react';
import { observer } from "mobx-react-lite";
import "./styles/app.scss"
import "./styles/room-interface.scss"
import "./styles/not-found.scss"
import "./styles/admin.scss"
import "./styles/coloring.scss"
import "./styles/gallery.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import NotFoundPage from "./components/NotFoundPage";
import ProfilePage from "./components/ProfilePage";
import AuthPage from "./components/AuthPage";
import AdminPage from "./components/AdminPage";
import ColoringPage from "./components/ColoringPage";
import GalleryPage from "./components/GalleryPage";
import RoomInterface from "./components/RoomInterface";
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";
import userState from "./store/userState";
import WebSocketService from "./services/WebSocketService";
import PersonalWSService from "./services/PersonalWSService";

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
    const hideGlobalUI = ['/profile', '/login', '/register', '/admin', '/coloring', '/gallery'].includes(location.pathname);

    useEffect(() => {
        if (userState.isAuthenticated) {
            const token = localStorage.getItem('token');
            if (token) {
                PersonalWSService.connect(token);
            }
        } else {
            PersonalWSService.disconnect();
        }
    }, [userState.isAuthenticated]);

    useEffect(() => {
        const handlePersonalMessage = (data) => {
            userState.addIncomingPersonalMessage(data);
        };
        PersonalWSService.on('personalMessage', handlePersonalMessage);
        return () => PersonalWSService.off('personalMessage', handlePersonalMessage);
    }, []);

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
        const allowedClientPaths = ['/', '/login', '/register', '/profile', '/404', '/admin', '/coloring', '/gallery'];
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
    const isColoringPage = location.pathname === '/coloring';
    const isGalleryPage = location.pathname === '/gallery';

    return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            {!hideGlobalUI && <TopMenu />}
            {!hideGlobalUI && <Toolbar />}
            {!hideGlobalUI && <SettingBar />}
            <div className={`main-content ${isAdminPage ? 'main-content--admin' : ''} ${isColoringPage ? 'main-content--coloring' : ''} ${isGalleryPage ? 'main-content--gallery' : ''}`}>
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/login' element={<AuthPage />} />
                    <Route path='/register' element={<AuthPage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    <Route path='/admin' element={<AdminPage />} />
                    <Route path='/coloring' element={<ColoringPage />} />
                    <Route path='/gallery' element={<GalleryPage />} />
                    <Route path='/:id' element={<RoomRoute />} />
                    <Route path='*' element={<Navigate to="/404" replace />} />
                </Routes>
                {canvasState.showRoomInterface && <RoomInterface roomId={null} />}
            </div>
        </div>
    );
});

export default App;
