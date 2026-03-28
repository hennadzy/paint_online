import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useParams, useLocation } from 'react-router-dom';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import Chat from './Chat';
import RoomInterface from './RoomInterface';
import AboutModal from './AboutModal';
import GamesModal from './GamesModal';
import RestoreDialog from './RestoreDialog';
import {
  useCanvasResize,
  useCanvasCursor,
  useCanvasKeyboard,
  useCustomScrollbars,
  useModalBodyClass,
  usePinchZoom,
  usePageVisibility
} from '../hooks';
import '../styles/canvas.scss';

const Canvas = observer(() => {
  const canvasRef = useRef();
  const cursorRef = useRef();
  const containerRef = useRef();
  const layoutRef = useRef();
  const params = useParams();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useCanvasResize(canvasRef, cursorRef, containerRef);
  usePinchZoom(containerRef);
  useCanvasCursor(canvasRef, cursorRef);
  useCanvasKeyboard();
  useModalBodyClass();
  useCustomScrollbars(containerRef, canvasState.isConnected);
  const isVisible = usePageVisibility();

  useEffect(() => {
    canvasState.setPageVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvasState.setShowAboutModal(false);

    if (canvasState.showRoomsList) {
      canvasState.setShowRoomInterface(true);
    } else {
      canvasState.setShowRoomInterface(false);
    }

    if (!params.id) {
      canvasState.setCurrentRoomId(null);
      canvasState.setUsername('local');
      canvasState.setModalOpen(false);
      toolState.setTool(new Brush(canvas, null, null, 'local'), 'brush');

      if (canvasState.returningFromRoom) {
        canvasState.restoreAutoSave();
        canvasState.returningFromRoom = false;
        canvasState.showRestoreDialog = false;
      } else {
        canvasState.checkForAutoSave();
      }
    } else {
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
    }

    return () => {
      if (params.id) {
        canvasState.disconnect(true);
      }
      canvasState.strokeList = [];
      canvasState.redoStacks.clear();
    };
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
    if (!canvasState.isConnected) return;
    const interval = setInterval(() => {
      canvasState.saveThumbnail();
    }, 60000);
    return () => clearInterval(interval);
  }, [canvasState.isConnected]);

  useEffect(() => {
    const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    if (!isMobilePortrait) return;

    const centerContainer = (container) => {
      const scrollX = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
      const scrollY = Math.max(0, (container.scrollHeight - container.clientHeight) / 2);
      container.scrollLeft = scrollX;
      container.scrollTop = scrollY;
    };

    const apply = () => {
      const container = containerRef.current;
      if (container) {
        const availableW = container.clientWidth - 20;
        const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
        canvasState.setZoom(fitZoom);
        requestAnimationFrame(() => centerContainer(container));
      }
    };
    if (!canvasState.isConnected) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        apply();
        setTimeout(apply, 150);
        setTimeout(apply, 300);
      }));
    } else {
      apply();
    }
  }, [canvasState.isConnected]);

  return (
    <div className={`canvas ${canvasState.isConnected ? 'canvas--has-chat' : ''}`}>
      <div ref={layoutRef} className={`canvas-layout ${canvasState.isConnected ? 'has-chat' : 'no-chat'}`}>

        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-container-inner">
            <div className="canvas-wrapper">
              <canvas ref={canvasRef} tabIndex={0} className="main-canvas" />
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
    </div>
  );
});

export default Canvas;
