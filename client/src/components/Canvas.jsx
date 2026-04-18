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
  usePageVisibility
} from '../hooks';
import { useMobileCanvasFit } from '../hooks/useMobileCanvasFit';
import '../styles/canvas.scss';

const Canvas = observer(() => {
  const canvasRef = useRef();
  const cursorRef = useRef();
  const containerRef = useRef();
  const layoutRef = useRef();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useCanvasResize(canvasRef, cursorRef, containerRef);
  usePinchZoom(containerRef);
  useCanvasCursor(canvasRef, cursorRef);
  useCanvasKeyboard();
  useModalBodyClass();
  useCustomScrollbars(containerRef, canvasState.isConnected);
  const isVisible = usePageVisibility();

  useMobileCanvasFit(containerRef, canvasState.isConnected);

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
      canvasState.restoreAutoSave();
      canvasState.returningFromRoom = false;
      canvasState.showRestoreDialog = false;
    } else {
      canvasState.checkForAutoSave();
    }
  };

  const initRoomMode = () => {
    canvasState.setShowRestoreDialog(false);
    canvasState.setZoom(1);
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
    const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    if (canvasState.isConnected && params.id && isMobilePortrait) {
      setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 100);
    }
  }, [canvasState.chatMessages.length]);

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
      canvasState.setZoom(1);
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
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth <= 768;
    if (!isMobile || !canvasState.currentRoomId || !canvasState.isConnected) return;

    let rafId = null;
    let keyboardTracking = false;

    const getChatInput = () => document.querySelector('.chat-input');

    const updateKeyboardState = () => {
      const chatInput = getChatInput();
      const isInputFocused = chatInput && chatInput === document.activeElement;
      
      if (!isInputFocused) {
        document.body.classList.remove('keyboard-open');
        document.documentElement.style.removeProperty('--keyboard-height');
        return;
      }

      const vv = window.visualViewport;
      const keyboardOpen = vv ? (vv.height < window.innerHeight * 0.9) : false;

      if (keyboardOpen) {
        document.body.classList.add('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', `${window.innerHeight - (vv?.height || window.innerHeight)}px`);
      } else {
        document.body.classList.remove('keyboard-open');
        document.documentElement.style.removeProperty('--keyboard-height');
      }

      if (keyboardTracking) {
        rafId = requestAnimationFrame(updateKeyboardState);
      }
    };

    const startKeyboardTracking = () => {
      if (keyboardTracking) return;
      keyboardTracking = true;
      updateKeyboardState();
    };

    const stopKeyboardTracking = () => {
      keyboardTracking = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.removeProperty('--keyboard-height');
    };

    const chatInput = getChatInput();

    if (chatInput) {
      chatInput.addEventListener('focus', startKeyboardTracking);
      chatInput.addEventListener('blur', stopKeyboardTracking);
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardState);
    }

    return () => {
      stopKeyboardTracking();
      if (chatInput) {
        chatInput.removeEventListener('focus', startKeyboardTracking);
        chatInput.removeEventListener('blur', stopKeyboardTracking);
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardState);
      }
    };
  }, [canvasState.isConnected, canvasState.currentRoomId]);

  useEffect(() => {
    if (!canvasState.isConnected) return;
    const interval = setInterval(() => {
      canvasState.saveThumbnail();
    }, 60000);
    return () => clearInterval(interval);
  }, [canvasState.isConnected]);


  return (
    <div className={`canvas ${canvasState.currentRoomId && canvasState.isConnected ? 'canvas--has-chat' : ''}`}>
      <div ref={layoutRef} className={`canvas-layout ${canvasState.currentRoomId && canvasState.isConnected ? 'has-chat' : ''}`}>

        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-container-inner">
            <div className="canvas-wrapper">
              <canvas ref={canvasRef} tabIndex={0} className="main-canvas" willReadFrequently={true} />
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
        <div className={`canvas-side-panel ${canvasState.isConnected ? 'show' : ''}`}>
          {canvasState.isConnected && <Chat />}
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
        onRestore={() => canvasState.restoreAutoSave()}
        onDiscard={() => canvasState.discardAutoSave()}
      />

      <InactiveModal />
    </div>
  );
});

export default Canvas;
