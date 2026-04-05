import React from 'react';
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
import PersonalMessagesModal from "./components/PersonalMessagesModal";
import SeoMeta from "./components/SeoMeta";
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";
import { isValidRoomId } from "./utils/routerUtils";
import { usePersonalMessages } from "./hooks/usePersonalMessages";
import { useRoomValidation } from "./hooks/useRoomValidation";

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
    const hideGlobalUI = ['/profile', '/login', '/register', '/reset-password', '/admin', '/coloring', '/gallery'].includes(location.pathname);

  usePersonalMessages();
  useRoomValidation(location.pathname, navigate);

    if (location.pathname === '/404') {
        return <NotFoundPage />;
    }

    const isAdminPage = location.pathname === '/admin';
    const isColoringPage = location.pathname === '/coloring';
    const isGalleryPage = location.pathname === '/gallery';

return (
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            <SeoMeta />
            {!hideGlobalUI && <TopMenu />}
            {!hideGlobalUI && <Toolbar />}
            {!hideGlobalUI && <SettingBar />}
            <div className={`main-content ${isAdminPage ? 'main-content--admin' : ''} ${isColoringPage ? 'main-content--coloring' : ''} ${isGalleryPage ? 'main-content--gallery' : ''}`}>
                <Routes>
                    <Route path='/' element={<Canvas />} />
                    <Route path='/login' element={<AuthPage />} />
                    <Route path='/register' element={<AuthPage />} />
                    <Route path='/reset-password' element={<AuthPage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    <Route path='/admin' element={<AdminPage />} />
                    <Route path='/coloring' element={<ColoringPage />} />
                    <Route path='/gallery' element={<GalleryPage />} />
                    <Route path='/:id' element={<RoomRoute />} />
                    <Route path='*' element={<Navigate to="/404" replace />} />
                </Routes>
                {canvasState.showRoomInterface && <RoomInterface roomId={null} />}
            </div>
            {canvasState.showPersonalMessages && (
                <PersonalMessagesModal
                    isOpen={canvasState.showPersonalMessages}
                    onClose={() => canvasState.setShowPersonalMessages(false, null)}
                    initialUser={canvasState.personalMessagesTargetUser}
                />
            )}
        </div>
    );
});

export default App;
