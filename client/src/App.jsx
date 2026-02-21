import React, { useEffect } from 'react';
import { observer } from "mobx-react-lite";
import "./styles/app.scss"
import "./styles/room-interface.scss"
import "./styles/not-found.scss"
import SettingBar from "./components/SettingBar";
import Toolbar from "./components/Toolbar";
import TopMenu from "./components/TopMenu";
import Canvas from "./components/Canvas";
import NotFoundPage from "./components/NotFoundPage";
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";

// ID комнаты на бэкенде — 9 символов (alphanumeric). Иначе сразу 404.
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

    // Сразу при загрузке: скрыть серверный fallback и при неверном пути — редирект на /404
    useEffect(() => {
        const fallback = document.getElementById('server-404-fallback');
        if (fallback) fallback.hidden = true;

        const path = location.pathname;
        if (path === '/' || path === '/404') return;

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

    return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            <TopMenu />
            <Toolbar />
            <SettingBar />
            <div className="main-content">
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/:id' element={<RoomRoute />} />
                    <Route path='*' element={<Navigate to="/404" replace />} />
                </Routes>
            </div>
        </div>
    );
});

export default App;
