import React, { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Chat from "./Chat";
import RoomInterface from "./RoomInterface";
import AboutModal from "./AboutModal";
import RestoreDialog from "./RestoreDialog";
import "../styles/canvas.scss";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Text from "../tools/Text";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const cursorRef = useRef();
  const containerRef = useRef();
  const layoutRef = useRef();
  const params = useParams();
  const navigate = useNavigate();
  const isPinching = useRef(false);

  const adjustCanvasSize = () => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    const logicalWidth = 720;
    const logicalHeight = 480;

    canvas.width = logicalWidth;
    canvas.height = logicalHeight;
    cursor.width = logicalWidth;
    cursor.height = logicalHeight;

    canvasState.setCanvas(canvas);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    canvasState.rebuildBuffer();
    canvasState.redrawCanvas();
    canvasState.setZoom(canvasState.zoom);
  };

  useEffect(() => {
    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);
    return () => window.removeEventListener("resize", adjustCanvasSize);
  }, []);

  useEffect(() => {
    console.log('Canvas useEffect - params.id:', params.id);
    console.log('Initial states - modalOpen:', canvasState.modalOpen, 'showRoomInterface:', canvasState.showRoomInterface, 'showAboutModal:', canvasState.showAboutModal);
    
    canvasState.setCanvas(canvasRef.current);
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    canvasState.setShowAboutModal(false);
    canvasState.setShowRoomInterface(false);
    canvasState.setShowRestoreDialog(false);

    if (!params.id) {
        console.log('Local mode - setting up');
        canvasState.setCurrentRoomId(null);
        canvasState.setUsername("local");
        canvasState.setModalOpen(false);
        console.log('After reset - modalOpen:', canvasState.modalOpen, 'showRoomInterface:', canvasState.showRoomInterface);
        toolState.setTool(new Brush(canvasRef.current, null, null, "local"), "brush");
        
        console.log('Setting up setTimeout for checkForAutoSave');
        const timeoutId = setTimeout(() => {
          console.log('setTimeout executed - Calling checkForAutoSave...');
          const result = canvasState.checkForAutoSave();
          console.log('checkForAutoSave result:', result);
          console.log('showRestoreDialog:', canvasState.showRestoreDialog);
          console.log('restoreTimestamp:', canvasState.restoreTimestamp);
        }, 500);
        console.log('setTimeout ID:', timeoutId);
    } else {
        console.log('Room mode - setting up for room:', params.id);
        canvasState.setCurrentRoomId(params.id);
        canvasState.setUsername("");
        canvasState.setModalOpen(false);
        console.log('After reset - modalOpen:', canvasState.modalOpen);
    }

    return () => {
        console.log('Canvas cleanup - params.id:', params.id);
        if (params.id) {
            canvasState.disconnect();
        }
        canvasState.strokeList = [];
        canvasState.redoStacks.clear();
    };
}, [params.id]);

  useEffect(() => {
    if (canvasState.isConnected && params.id) {
      toolState.setTool(new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionId), "brush");
    }
  }, [canvasState.isConnected, params.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const preventScroll = (e) => e.preventDefault();
      canvas.addEventListener('wheel', preventScroll, { passive: false });
      return () => canvas.removeEventListener('wheel', preventScroll);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.isPinching = () => isPinching.current;

    let initialDistance = 0;
    let initialZoom = 1;
    let activeTouches = 0;

    const getDistance = (touch1, touch2) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const stopDrawing = () => {
      if (toolState.tool && toolState.tool.mouseDown) {
        const tool = toolState.tool;
        tool.mouseDown = false;
        canvasState.isDrawing = false;
        
        if (typeof tool.commitStroke === 'function') {
          let shouldCommit = false;
          if (tool.points && tool.points.length > 0) {
            shouldCommit = true;
          } else if (tool.startX !== undefined && tool.startY !== undefined) {
            shouldCommit = true;
          }
          
          if (shouldCommit) {
            tool.commitStroke();
          }
        }
      }
    };

    const handleTouchStart = (e) => {
      activeTouches = e.touches.length;
      if (e.touches.length === 2) {
        e.preventDefault();
        stopDrawing();
        isPinching.current = true;
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialZoom = canvasState.zoom;
      } else if (e.touches.length > 2) {
        e.preventDefault();
        stopDrawing();
        isPinching.current = true;
      }
    };

    const handleTouchMove = (e) => {
      const touchCount = e.touches.length;
      
      if (touchCount >= 2) {
        e.preventDefault();
        stopDrawing();
        isPinching.current = true;
        
        if (touchCount === 2 && initialDistance > 0) {
          const currentDistance = getDistance(e.touches[0], e.touches[1]);
          const scale = currentDistance / initialDistance;
          const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
          canvasState.setZoom(newZoom);
        } else if (touchCount === 2 && initialDistance === 0) {
          initialDistance = getDistance(e.touches[0], e.touches[1]);
          initialZoom = canvasState.zoom;
        }
      } else if (touchCount === 1 && isPinching.current) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      activeTouches = e.touches.length;
      if (e.touches.length < 2) {
        initialDistance = 0;
        setTimeout(() => {
          if (e.touches.length < 2) {
            isPinching.current = false;
          }
        }, 150);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const updateCursorOverlay = (x, y) => {
    const canvas = cursorRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const diameter = toolState.tool?.lineWidth ?? 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (toolState.toolName === 'text') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();

      return;
    }
    ctx.beginPath();
    ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if(!canvas || !cursor) return;

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      updateCursorOverlay(x, y);
    };

    const clearCursor = () => {
      const ctx = cursor.getContext("2d");
      ctx.clearRect(0, 0, cursor.width, cursor.height);
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("mouseleave", clearCursor);
    canvas.addEventListener("pointerleave", clearCursor);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("mouseleave", clearCursor);
      canvas.removeEventListener("pointerleave", clearCursor);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'none';
    }
  }, [toolState.toolName]);

  useEffect(() => {
    if (canvasState.isConnected && window.innerWidth < 768) {
      setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 100);
    }
  }, [canvasState.chatMessages.length]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (toolState.textInputActive || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const { canvas, socket, sessionid, username } = canvasState;
      if (!canvas) return;
      const safeUsername = username || "local";

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasState.undo();
        return;
      }

      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        canvasState.redo();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        canvasState.zoomIn();
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        canvasState.zoomOut();
        return;
      }

      const toolMap = {
        'b': [Brush, 'brush'],
        'e': [Eraser, 'eraser'],
        'l': [Line, 'line'],
        'r': [Rect, 'rect'],
        'c': [Circle, 'circle'],
        't': [Text, 'text']
      };

      const tool = toolMap[e.key.toLowerCase()];
      if (tool) {
        toolState.setTool(new tool[0](canvas, socket, sessionid, safeUsername), tool[1]);
      } else if (e.key.toLowerCase() === 'g') {
        canvasState.toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  return (
    <div className="canvas">
      <div ref={layoutRef} className={`canvas-layout ${canvasState.isConnected ? 'has-chat' : ''}`}>
        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              className="main-canvas"
            />
            <canvas
              ref={cursorRef}
              className="cursor-overlay"
            />
          </div>
          
          {(canvasState.modalOpen || canvasState.showRoomInterface) && (
            <RoomInterface roomId={params.id} />
          )}
          
          <AboutModal />
        </div>

        {!canvasState.isConnected && !params.id && (
          <button 
            className="about-btn-mobile"
            onClick={() => canvasState.setShowAboutModal(true)}
          >
            О программе
          </button>
        )}

        <div className={`canvas-side-panel ${canvasState.isConnected ? 'show' : ''}`}>
          {canvasState.isConnected && <Chat />}
        </div>

        <RestoreDialog 
          show={canvasState.showRestoreDialog}
          timestamp={canvasState.restoreTimestamp}
          onRestore={() => canvasState.restoreAutoSave()}
          onDiscard={() => canvasState.discardAutoSave()}
        />
      </div>
    </div>
  );
});

export default Canvas;
