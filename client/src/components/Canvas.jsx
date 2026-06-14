import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import Chat from './Chat';
import RoomInterface from './RoomInterface';
import AboutModal from './AboutModal';
import GamesModal from './GamesModal';
import RestoreDialog from './RestoreDialog';
import InactiveModal from './InactiveModal';
import {
  useCanvasResize,
  useCanvasCursor,
  useCanvasKeyboard,
  useCustomScrollbars,
  useModalBodyClass,
  usePinchZoom,
  usePageVisibility,
  useSelectionOverlay,
} from '../hooks';
import { useMobileCanvasFit } from '../hooks/useMobileCanvasFit';
import { isMobileCanvasView } from '../utils/pinchPanGestures';
import '../styles/canvas.scss';

const Canvas = observer(() => {
  const canvasRef = useRef();
  const cursorRef = useRef();
  const selectionOverlayRef = useRef();
  const containerRef = useRef();
  const wrapperRef = useRef();
  const layoutRef = useRef();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useCanvasResize(canvasRef, cursorRef, containerRef, selectionOverlayRef);
  usePinchZoom(containerRef, wrapperRef);
  useCanvasCursor(canvasRef, cursorRef);
  useSelectionOverlay(selectionOverlayRef, canvasRef);
  useCanvasKeyboard();
  useModalBodyClass();
  useCustomScrollbars(containerRef, wrapperRef, canvasState.isConnected);
  const isVisible = usePageVisibility();

  useMobileCanvasFit(containerRef, canvasState.isConnected, Boolean(params.id));

  useEffect(() => {
    canvasState.setPageVisible(isVisible);
  }, [isVisible]);

  const initCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const initLocalMode = () => {
    canvasState.setCurrentRoomId(null);
    canvasState.setUsername('local');
    canvasState.setModalOpen(false);
    toolState.setTool(new Brush(canvasRef.current, null, null, 'local'), 'brush');

    if (canvasState.returningFromRoom) {
      void canvasState.restoreAutoSave();
      canvasState.returningFromRoom = false;
      canvasState.showRestoreDialog = false;
    } else {
      canvasState.checkForAutoSave();
    }
  };

  const initRoomMode = () => {
    canvasState.setShowRestoreDialog(false);
    canvasState.resetViewTransform();
    canvasState.setCurrentRoomId(params.id);
    canvasState.setUsername('');
    canvasState.setModalOpen(false);

    const adminToken = localStorage.getItem('adminJoinToken');
    if (adminToken) {
      localStorage.removeItem('adminJoinToken');
      canvasState.connectToRoom(params.id, 'Admin', adminToken);
    }
  };

  const cleanup = () => {
    if (params.id) {
      canvasState.disconnect(true);
    } else if (!canvasState.isConnected) {
      canvasState.performAutoSaveOnExit();
    }
    canvasState.strokeList = [];
    canvasState.redoStacks.clear();
  };

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    initCanvasContext();

    canvasState.setShowAboutModal(false);

    if (canvasState.showRoomsList) {
      canvasState.setShowRoomInterface(true);
    } else {
      canvasState.setShowRoomInterface(false);
    }

    if (!params.id) {
      initLocalMode();
    } else {
      initRoomMode();
    }

    return cleanup;
  }, [params.id]);

  useEffect(() => {
    if (canvasState.isConnected && params.id) {
      toolState.setTool(
        new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionId, canvasState.username || 'local'),
        'brush'
      );
    }
  }, [canvasState.isConnected, params.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const handleWheel = (e) => {
        const isMobileLandscape = window.innerWidth <= 768 && window.innerHeight <= window.innerWidth;
        if (window.innerWidth > 768 || isMobileLandscape) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          const newZoom = Math.max(0.5, Math.min(3, canvasState.zoom + delta));
          canvasState.setZoom(newZoom);
        }
      };
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
      }
    };

    layout.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      layout.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!canvasState.isConnected || !canvasState.currentRoomId) {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      canvasState.resetViewTransform();
      if (document.body.style.position === 'fixed') {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
      document.body.classList.remove('keyboard-open');
      void containerRef.current?.offsetHeight;
      window.dispatchEvent(new Event('resize'));
    }
  }, [canvasState.isConnected, canvasState.currentRoomId]);


  useEffect(() => {
    if (!canvasState.isConnected) return;
    const interval = setInterval(() => {
      canvasState.saveThumbnail();
    }, 60000);
    return () => clearInterval(interval);
  }, [canvasState.isConnected]);


  const isMobileCanvas = isMobileCanvasView();
  const inRoom = Boolean(params.id);
  const showChat = canvasState.isConnected;

  return (
    <div className={`canvas ${inRoom ? 'canvas--has-chat' : ''}`}>
      <div ref={layoutRef} className={`canvas-layout ${inRoom ? 'has-chat' : ''}`}>

        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-container-inner">
            <div
              ref={wrapperRef}
              className="canvas-wrapper"
              style={
                isMobileCanvas
                  ? {
                      transform: `translate(${canvasState.viewPanX}px, ${canvasState.viewPanY}px) scale(${canvasState.viewZoom})`,
                      transformOrigin: 'center center',
                    }
                  : {
                      transform: `translate(${canvasState.viewPanX}px, ${canvasState.viewPanY}px)`,
                      transformOrigin: 'center center',
                    }
              }
            >
              <canvas ref={canvasRef} tabIndex={0} className="main-canvas" willReadFrequently={true} />
              <canvas ref={selectionOverlayRef} className="selection-overlay" />
              <canvas ref={cursorRef} className="cursor-overlay" />
            </div>
          </div>
        </div>
        {isHome && !canvasState.isConnected && !canvasState.currentRoomId && (
          <div className="about-btns-mobile">
            <button
              className="about-btn-mobile"
              onClick={() => canvasState.setShowRoomInterface(true)}
            >
              Совместное рисование
            </button>
            <button
              className="about-btn-mobile"
              onClick={() => canvasState.setShowGamesModal(true)}
            >
              Игровые режимы
            </button>
            <button
              className="about-btn-mobile"
              onClick={() => navigate('/gallery')}
            >
              Галерея работ
            </button>
          </div>
        )}
        <div className={`canvas-side-panel ${inRoom ? 'show' : ''}`}>
          {showChat && <Chat />}
        </div>
      </div>

      {(canvasState.modalOpen || canvasState.showRoomInterface) && (
        <RoomInterface roomId={params.id} />
      )}

      <AboutModal />

      <GamesModal />

        <RestoreDialog
        show={canvasState.showRestoreDialog}
        timestamp={canvasState.restoreTimestamp}
        onRestore={() => { canvasState.restoreAutoSave(); }}
        onDiscard={() => canvasState.discardAutoSave()}
      />

      <InactiveModal />
    </div>
  );
});

export default Canvas;
