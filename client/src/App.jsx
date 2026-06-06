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
import PersonalMessagesModal from "./components/PersonalMessagesModal";
import SeoMeta, { SeoProvider } from "./components/SeoMeta";
import HelpPage from "./components/HelpPage";
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import canvasState from "./store/canvasState";
import capabilitiesState from "./store/capabilitiesState";
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

  const isHelpPageByPath =
       location.pathname === '/help' ||
       location.pathname === '/help/' ||
       location.pathname.startsWith('/help/');

    useEffect(() => {
        capabilitiesState.fetch();
    }, []);

  const hideGlobalUI = ['/profile', '/login', '/register', '/reset-password', '/admin', '/help'].includes(location.pathname)
      || location.pathname === '/gallery'
      || location.pathname.startsWith('/gallery/')
      || location.pathname === '/coloring'
      || location.pathname.startsWith('/coloring/');
  
  usePersonalMessages();
  useRoomValidation(location.pathname, navigate);

    if (location.pathname === '/404') {
        return <NotFoundPage />;
    }

    const isAdminPage = location.pathname === '/admin';
    const isColoringPage = location.pathname === '/coloring';
    const isGalleryPage = location.pathname === '/gallery' || location.pathname.startsWith('/gallery/');
    const isHelpPage = location.pathname === '/help';
    const isColoringSectionPage = location.pathname.startsWith('/coloring/') && location.pathname !== '/coloring';

return (
        <SeoProvider>
        <div className={`app ${canvasState.isConnected ? 'connected' : ''}`}>
            <SeoMeta />
            {!hideGlobalUI && <TopMenu />}
            {!hideGlobalUI && <Toolbar />}
            {!hideGlobalUI && <SettingBar />}
            <div className={`main-content ${isAdminPage ? 'main-content--admin' : ''} ${isColoringPage ? 'main-content--coloring' : ''} ${isGalleryPage ? 'main-content--gallery' : ''} ${isHelpPage ? 'main-content--help' : ''} ${isColoringSectionPage ? 'main-content--coloring-section' : ''}`}>
                {isHelpPageByPath ? (
                    <HelpPage />
                ) : (
                    <Routes>
                        <Route path='/' element={<Canvas />} />
                        <Route path='/login' element={<AuthPage />} />
                        <Route path='/register' element={<AuthPage />} />
                        <Route path='/reset-password' element={<AuthPage />} />
                        <Route path='/profile' element={<ProfilePage />} />
                        <Route path='/admin' element={<AdminPage />} />
                        <Route path='/help' element={<HelpPage />} />
                        <Route path='/coloring' element={<ColoringPage />} />
                        <Route path='/coloring/:sectionSlug' element={<ColoringPage />} />
                        <Route path='/coloring/:sectionSlug/:pageSlug' element={<ColoringPage />} />
                        <Route path='/gallery' element={<GalleryPage />} />
                        <Route path='/gallery/:id' element={<GalleryPage />} />
                        <Route path='/:id' element={<RoomRoute />} />
                        <Route path='*' element={<Navigate to="/404" replace />} />
                    </Routes>
                )}
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
        </SeoProvider>
    );
});

export default App;
