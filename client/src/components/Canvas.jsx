import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useParams, useLocation } from 'react-router-dom';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import Chat from './Chat';
import RoomInterface from './RoomInterface';
import AboutModal from './AboutModal';
import FeedbackModal from './FeedbackModal';
import RestoreDialog from './RestoreDialog';
import {
  useCanvasResize,
  useCanvasCursor,
  useCanvasKeyboard,
  useCustomScrollbars,
  useModalBodyClass,
  usePinchZoom
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

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvasState.setShowAboutModal(false);
    canvasState.setShowRoomInterface(false);

    if (!params.id) {
      canvasState.setCurrentRoomId(null);
      canvasState.setUsername('local');
      canvasState.setModalOpen(false);
      toolState.setTool(new Brush(canvas, null, null, 'local'), 'brush');
      canvasState.checkForAutoSave();
    } else {
      canvasState.setShowRestoreDialog(false);
      canvasState.setCurrentRoomId(params.id);
      canvasState.setUsername('');
      canvasState.setModalOpen(false);
    }

    return () => {
      if (params.id) {
        canvasState.disconnect();
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
        if (window.innerWidth > 768) {
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
    if (canvasState.isConnected && window.innerWidth < 768) {
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
    if (window.innerWidth > 768) return;
    const apply = () => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
        const availableW = container.clientWidth - 20;
        const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
        canvasState.setZoom(fitZoom);
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
              onClick={() => canvasState.setShowAboutModal(true)}
            >
              О программе
            </button>
            <button
              className="about-btn-mobile"
              onClick={() => canvasState.setShowFeedbackModal(true)}
            >
              Обратная связь
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
      <FeedbackModal />

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
