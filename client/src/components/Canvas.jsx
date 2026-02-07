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
  const initialMobileZoomDone = useRef(false);

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

  // На мобильном при старте: холст по ширине экрана, без полос прокрутки (полосы только при увеличении)
  useEffect(() => {
    if (window.innerWidth > 768) return;
    if (initialMobileZoomDone.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      initialMobileZoomDone.current = true;
      const availableW = container.clientWidth - 25; // 5px left + 20px right
      const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
      canvasState.setZoom(fitZoom);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    canvasState.setShowAboutModal(false);
    canvasState.setShowRoomInterface(false);

    if (!params.id) {
        canvasState.setCurrentRoomId(null);
        canvasState.setUsername("local");
        canvasState.setModalOpen(false);
        toolState.setTool(new Brush(canvasRef.current, null, null, "local"), "brush");
        
        canvasState.checkForAutoSave();
    } else {
        canvasState.setShowRestoreDialog(false);
        canvasState.setCurrentRoomId(params.id);
        canvasState.setUsername("");
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
    let pinchCenterX = 0;
    let pinchCenterY = 0;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;

    const getDistance = (touch1, touch2) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getPinchCenter = (touch1, touch2) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
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
        
        const center = getPinchCenter(e.touches[0], e.touches[1]);
        const containerRect = container.getBoundingClientRect();
        pinchCenterX = center.x - containerRect.left + container.scrollLeft;
        pinchCenterY = center.y - containerRect.top + container.scrollTop;
        initialScrollLeft = container.scrollLeft;
        initialScrollTop = container.scrollTop;
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
          
          // Увеличение относительно центра жеста
          const zoomChange = newZoom / canvasState.zoom;
          const containerRect = container.getBoundingClientRect();
          
          // Центр жеста относительно viewport
          const currentCenter = getPinchCenter(e.touches[0], e.touches[1]);
          const viewportX = currentCenter.x - containerRect.left;
          const viewportY = currentCenter.y - containerRect.top;
          
          // Точка на холсте, которую нужно сохранить под пальцами
          const canvasPointX = (container.scrollLeft + viewportX) / canvasState.zoom;
          const canvasPointY = (container.scrollTop + viewportY) / canvasState.zoom;
          
          canvasState.setZoom(newZoom);
          
          requestAnimationFrame(() => {
            container.scrollLeft = canvasPointX * newZoom - viewportX;
            container.scrollTop = canvasPointY * newZoom - viewportY;
          });
        } else if (touchCount === 2 && initialDistance === 0) {
          initialDistance = getDistance(e.touches[0], e.touches[1]);
          initialZoom = canvasState.zoom;
          
          const center = getPinchCenter(e.touches[0], e.touches[1]);
          const containerRect = container.getBoundingClientRect();
          pinchCenterX = center.x - containerRect.left + container.scrollLeft;
          pinchCenterY = center.y - containerRect.top + container.scrollTop;
          initialScrollLeft = container.scrollLeft;
          initialScrollTop = container.scrollTop;
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

  useEffect(() => {
    const isModalOpen = canvasState.showAboutModal || canvasState.showRoomInterface || canvasState.modalOpen || canvasState.showRestoreDialog;
    if (isModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [canvasState.showAboutModal, canvasState.showRoomInterface, canvasState.modalOpen, canvasState.showRestoreDialog]);

  // При смене режима (локальный ↔ совместный): на мобильном всегда исходное положение и размер холста
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const apply = () => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth - 25; // 5px left + 20px right
        const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
        canvasState.setZoom(fitZoom);
      }
    };
    if (!canvasState.isConnected) {
      requestAnimationFrame(() => requestAnimationFrame(apply));
      setTimeout(apply, 80);
    } else {
      apply();
    }
  }, [canvasState.isConnected]);

  // При смене режима рисования (инструмента) на мобильном — начальное положение и размер холста
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    container.scrollLeft = 0;
    const availableW = container.clientWidth - 25;
    const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
    canvasState.setZoom(fitZoom);
  }, [toolState.toolName]);

  // Кастомные скроллбары для мобильных устройств
  useEffect(() => {
    const container = containerRef.current;
    if (!container || window.innerWidth > 768) return;

    const createScrollbar = (isVertical) => {
      const scrollbar = document.createElement('div');
      scrollbar.className = `custom-scrollbar ${isVertical ? 'vertical' : 'horizontal'}`;
      
      const thumb = document.createElement('div');
      thumb.className = 'custom-scrollbar-thumb';
      scrollbar.appendChild(thumb);
      
      container.appendChild(scrollbar);
      
      let isDragging = false;
      let startPos = 0;
      let startScroll = 0;

      const updateThumb = () => {
        const containerRect = container.getBoundingClientRect();
        
        if (isVertical) {
          const hasScroll = container.scrollHeight > container.clientHeight;
          scrollbar.style.display = hasScroll ? 'block' : 'none';
          
          if (hasScroll) {
            const scrollRatio = container.scrollTop / (container.scrollHeight - container.clientHeight);
            const trackHeight = container.clientHeight - 20; // место под горизонтальный скроллбар
            const thumbHeight = Math.max(100, (container.clientHeight / container.scrollHeight) * trackHeight);
            const maxThumbTop = trackHeight - thumbHeight;
            
            thumb.style.height = thumbHeight + 'px';
            thumb.style.top = (scrollRatio * maxThumbTop) + 'px';
          }
        } else {
          const hasScroll = container.scrollWidth > container.clientWidth;
          scrollbar.style.display = hasScroll ? 'block' : 'none';
          
          if (hasScroll) {
            const scrollRatio = container.scrollLeft / (container.scrollWidth - container.clientWidth);
            const trackWidth = container.clientWidth - 20; // место под вертикальный скроллбар
            const thumbWidth = Math.max(100, (container.clientWidth / container.scrollWidth) * trackWidth);
            const maxThumbLeft = trackWidth - thumbWidth;
            
            thumb.style.width = thumbWidth + 'px';
            thumb.style.left = (scrollRatio * maxThumbLeft) + 'px';
          }
        }
      };

      const handleStart = (e) => {
        isDragging = true;
        const touch = e.touches?.[0];
        startPos = isVertical ? (touch?.clientY || e.clientY) : (touch?.clientX || e.clientX);
        startScroll = isVertical ? container.scrollTop : container.scrollLeft;
        thumb.classList.add('active');
        e.preventDefault();
        e.stopPropagation();
      };

      const handleMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches?.[0];
        const currentPos = isVertical ? (touch?.clientY || e.clientY) : (touch?.clientX || e.clientX);
        const delta = currentPos - startPos;
        
        if (isVertical) {
          const trackHeight = container.clientHeight - 20;
          const thumbHeight = parseFloat(thumb.style.height);
          const scrollRatio = delta / (trackHeight - thumbHeight);
          container.scrollTop = startScroll + scrollRatio * (container.scrollHeight - container.clientHeight);
        } else {
          const trackWidth = container.clientWidth - 20;
          const thumbWidth = parseFloat(thumb.style.width);
          const scrollRatio = delta / (trackWidth - thumbWidth);
          container.scrollLeft = startScroll + scrollRatio * (container.scrollWidth - container.clientWidth);
        }
        e.preventDefault();
        e.stopPropagation();
      };

      const handleEnd = () => {
        isDragging = false;
        thumb.classList.remove('active');
      };

      thumb.addEventListener('mousedown', handleStart);
      thumb.addEventListener('touchstart', handleStart, { passive: false });
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      
      container.addEventListener('scroll', updateThumb);
      const resizeObserver = new ResizeObserver(updateThumb);
      resizeObserver.observe(container);
      updateThumb();

      return () => {
        thumb.removeEventListener('mousedown', handleStart);
        thumb.removeEventListener('touchstart', handleStart);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
        container.removeEventListener('scroll', updateThumb);
        resizeObserver.disconnect();
        scrollbar.remove();
      };
    };

    const cleanupVertical = createScrollbar(true);
    const cleanupHorizontal = createScrollbar(false);

    return () => {
      cleanupVertical();
      cleanupHorizontal();
    };
  }, []);


  return (
    <div className={`canvas ${canvasState.isConnected ? 'canvas--has-chat' : ''}`}>
      <div ref={layoutRef} className={`canvas-layout ${canvasState.isConnected ? 'has-chat' : 'no-chat'}`}>
        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-container-inner">
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
          </div>
        </div>

        {!canvasState.isConnected && !canvasState.currentRoomId && (
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
      </div>

      {(canvasState.modalOpen || canvasState.showRoomInterface) && (
        <RoomInterface roomId={params.id} />
      )}
      
      <AboutModal />

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
