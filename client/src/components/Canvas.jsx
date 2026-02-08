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

  // ╨Э╨░ ╨╝╨╛╨▒╨╕╨╗╤М╨╜╨╛╨╝ ╨┐╤А╨╕ ╤Б╤В╨░╤А╤В╨╡: ╤Е╨╛╨╗╤Б╤В ╨┐╨╛ ╤И╨╕╤А╨╕╨╜╨╡ ╤Н╨║╤А╨░╨╜╨░, ╨▒╨╡╨╖ ╨┐╨╛╨╗╨╛╤Б ╨┐╤А╨╛╨║╤А╤Г╤В╨║╨╕ (╨┐╨╛╨╗╨╛╤Б╤Л ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ ╤Г╨▓╨╡╨╗╨╕╤З╨╡╨╜╨╕╨╕)
  useEffect(() => {
    if (window.innerWidth > 768) return;
    if (initialMobileZoomDone.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      initialMobileZoomDone.current = true;
      const availableW = container.clientWidth - 20; // 20px ╨┐╨╛╨┤ ╨▓╨╡╤А╤В╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А (╨▒╨░╨╖╨╛╨▓╤Л╨╡ 5px ╤Б╨╗╨╡╨▓╨░/╤Б╨┐╤А╨░╨▓╨░ тАФ ╨▓ padding)
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
    let initialCenterX = 0;
    let initialCenterY = 0;

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
        initialCenterX = center.x;
        initialCenterY = center.y;
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
          const currentCenter = getPinchCenter(e.touches[0], e.touches[1]);
          const containerRect = container.getBoundingClientRect();

          // ╨б╨┤╨▓╨╕╨│ ╨┤╨▓╤Г╨╝╤П ╨┐╨░╨╗╤М╤Ж╨░╨╝╨╕: ╨┤╨╡╨╗╤М╤В╨░ ╤Ж╨╡╨╜╤В╤А╨░ ╨╢╨╡╤Б╤В╨░ ╨▓ ╤Н╨║╤А╨░╨╜╨╜╤Л╤Е ╨║╨╛╨╛╤А╨┤╨╕╨╜╨░╤В╨░╤Е
          const translationX = currentCenter.x - initialCenterX;
          const translationY = currentCenter.y - initialCenterY;
          const pannedScrollLeft = initialScrollLeft + translationX;
          const pannedScrollTop = initialScrollTop + translationY;

          const scale = currentDistance / initialDistance;
          const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));

          // Viewport-╨║╨╛╨╛╤А╨┤╨╕╨╜╨░╤В╤Л ╤Ж╨╡╨╜╤В╤А╨░ ╨╢╨╡╤Б╤В╨░
          const viewportX = currentCenter.x - containerRect.left;
          const viewportY = currentCenter.y - containerRect.top;
          // ╨в╨╛╤З╨║╨░ ╨╜╨░ ╤Е╨╛╨╗╤Б╤В╨╡ ╨┐╨╛╨┤ ╤Ж╨╡╨╜╤В╤А╨╛╨╝ ╨╢╨╡╤Б╤В╨░ (╤Б ╤Г╤З╤С╤В╨╛╨╝ ╤Г╨╢╨╡ ╨┐╤А╨╕╨╝╨╡╨╜╤С╨╜╨╜╨╛╨│╨╛ ╤Б╨┤╨▓╨╕╨│╨░)
          const canvasPointX = (pannedScrollLeft + viewportX) / canvasState.zoom;
          const canvasPointY = (pannedScrollTop + viewportY) / canvasState.zoom;

          canvasState.setZoom(newZoom);

          requestAnimationFrame(() => {
            container.scrollLeft = canvasPointX * newZoom - viewportX;
            container.scrollTop = canvasPointY * newZoom - viewportY;
          });
        } else if (touchCount === 2 && initialDistance === 0) {
          initialDistance = getDistance(e.touches[0], e.touches[1]);
          initialZoom = canvasState.zoom;
          const center = getPinchCenter(e.touches[0], e.touches[1]);
          initialCenterX = center.x;
          initialCenterY = center.y;
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

  // ╨Я╤А╨╕ ╤Б╨╝╨╡╨╜╨╡ ╤А╨╡╨╢╨╕╨╝╨░ (╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╣ тЖФ ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╜╤Л╨╣): ╨╜╨░ ╨╝╨╛╨▒╨╕╨╗╤М╨╜╨╛╨╝ ╨▓╤Б╨╡╨│╨┤╨░ ╨╕╤Б╤Е╨╛╨┤╨╜╨╛╨╡ ╨┐╨╛╨╗╨╛╨╢╨╡╨╜╨╕╨╡ ╨╕ ╤А╨░╨╖╨╝╨╡╤А ╤Е╨╛╨╗╤Б╤В╨░
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const apply = () => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth - 20; // 20px ╨┐╨╛╨┤ ╨▓╨╡╤А╤В╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А
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

  // ╨Я╤А╨╕ ╤Б╨╝╨╡╨╜╨╡ ╤А╨╡╨╢╨╕╨╝╨░ ╤А╨╕╤Б╨╛╨▓╨░╨╜╨╕╤П (╨╕╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В╨░) ╨╜╨░ ╨╝╨╛╨▒╨╕╨╗╤М╨╜╨╛╨╝ тАФ ╨╜╨░╤З╨░╨╗╤М╨╜╨╛╨╡ ╨┐╨╛╨╗╨╛╨╢╨╡╨╜╨╕╨╡ ╨╕ ╤А╨░╨╖╨╝╨╡╤А ╤Е╨╛╨╗╤Б╤В╨░
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    container.scrollLeft = 0;
    const availableW = container.clientWidth - 20; // 20px ╨┐╨╛╨┤ ╨▓╨╡╤А╤В╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А
    const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
    canvasState.setZoom(fitZoom);
  }, [toolState.toolName]);

  // ╨Ъ╨░╤Б╤В╨╛╨╝╨╜╤Л╨╡ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А╤Л ╨┤╨╗╤П ╨╝╨╛╨▒╨╕╨╗╤М╨╜╤Л╤Е: ╨┐╨╛╨▓╨╡╨┤╨╡╨╜╨╕╨╡ ╨║╨░╨║ ╤Г ╨╜╨░╤В╨╕╨▓╨╜╤Л╤Е (╤В╤А╨╡╨║ + ╨┐╨╛╨╗╨╖╤Г╨╜╨╛╨║, ╨║╨╗╨╕╨║ ╨┐╨╛ ╤В╤А╨╡╨║╤Г = ╨┐╤А╨╛╨║╤А╤Г╤В╨║╨░ ╨╜╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Г)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || window.innerWidth > 768) return;

    const TRACK_VERTICAL_INSET = 20; // ╨╝╨╡╤Б╤В╨╛ ╨┐╨╛╨┤ ╨│╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А
    const TRACK_HORIZONTAL_INSET = 20; // ╨╝╨╡╤Б╤В╨╛ ╨┐╨╛╨┤ ╨▓╨╡╤А╤В╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨║╤А╨╛╨╗╨╗╨▒╨░╤А
    const MIN_THUMB_SIZE = 24; // ╨╝╨╕╨╜╨╕╨╝╤Г╨╝ ╨┐╨╛╨╗╨╖╤Г╨╜╨║╨░; ╨┐╤А╨╕ ╤А╨╛╤Б╤В╨╡ ╤Е╨╛╨╗╤Б╤В╨░ ╨┐╨╛╨╗╨╖╤Г╨╜╨╛╨║ ╤Г╨╝╨╡╨╜╤М╤И╨░╨╡╤В╤Б╤П ╨┐╤А╨╛╨┐╨╛╤А╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛

    const createScrollbar = (isVertical) => {
      const scrollbar = document.createElement('div');
      scrollbar.className = `custom-scrollbar ${isVertical ? 'vertical' : 'horizontal'}`;

      const thumb = document.createElement('div');
      thumb.className = 'custom-scrollbar-thumb';
      scrollbar.appendChild(thumb);

      document.body.appendChild(scrollbar);

      let isDragging = false;
      let startPos = 0;
      let startScroll = 0;

      const updateThumb = () => {
        const rect = container.getBoundingClientRect();
        if (isVertical) {
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          const scrollableRange = Math.max(0, scrollHeight - clientHeight);
          const hasScroll = scrollableRange > 0;
          scrollbar.style.display = hasScroll ? 'block' : 'none';

          scrollbar.style.top = `${rect.top}px`;
          scrollbar.style.height = `${rect.height - TRACK_VERTICAL_INSET}px`;

          if (hasScroll) {
            const trackHeight = rect.height - TRACK_VERTICAL_INSET;
            const thumbHeight = Math.max(
              MIN_THUMB_SIZE,
              (clientHeight / scrollHeight) * trackHeight
            );
            const thumbTravel = Math.max(0, trackHeight - thumbHeight);
            const scrollRatio = scrollableRange > 0 ? container.scrollTop / scrollableRange : 0;
            const thumbTop = thumbTravel * scrollRatio;

            thumb.style.height = `${thumbHeight}px`;
            thumb.style.top = `${thumbTop}px`;
          }
        } else {
          const scrollWidth = container.scrollWidth;
          const clientWidth = container.clientWidth;
          const scrollableRange = Math.max(0, scrollWidth - clientWidth);
          const hasScroll = scrollableRange > 0;
          scrollbar.style.display = hasScroll ? 'block' : 'none';

          scrollbar.style.left = `${rect.left}px`;
          scrollbar.style.width = `${rect.width - TRACK_HORIZONTAL_INSET}px`;
          scrollbar.style.top = `${Math.min(rect.bottom - 20, window.innerHeight - 20)}px`;
          scrollbar.style.height = '20px';

          if (hasScroll) {
            const trackWidth = rect.width - TRACK_HORIZONTAL_INSET;
            const thumbWidth = Math.max(
              MIN_THUMB_SIZE,
              (clientWidth / scrollWidth) * trackWidth
            );
            const thumbTravel = Math.max(0, trackWidth - thumbWidth);
            const scrollRatio = scrollableRange > 0 ? container.scrollLeft / scrollableRange : 0;
            const thumbLeft = thumbTravel * scrollRatio;

            thumb.style.width = `${thumbWidth}px`;
            thumb.style.left = `${thumbLeft}px`;
          }
        }
      };

      const handleThumbStart = (e) => {
        isDragging = true;
        const touch = e.touches?.[0];
        startPos = isVertical ? (touch?.clientY ?? e.clientY) : (touch?.clientX ?? e.clientX);
        startScroll = isVertical ? container.scrollTop : container.scrollLeft;
        thumb.classList.add('active');
        e.preventDefault();
        e.stopPropagation();
      };

      const handleMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches?.[0];
        const currentPos = isVertical ? (touch?.clientY ?? e.clientY) : (touch?.clientX ?? e.clientX);
        const delta = currentPos - startPos;

        if (isVertical) {
          const trackHeight = container.clientHeight - TRACK_VERTICAL_INSET;
          const thumbHeight = parseFloat(thumb.style.height) || MIN_THUMB_SIZE;
          const thumbTravel = Math.max(0, trackHeight - thumbHeight);
          const scrollableRange = container.scrollHeight - container.clientHeight;
          if (thumbTravel > 0 && scrollableRange > 0) {
            const scrollDelta = (delta / thumbTravel) * scrollableRange;
            const next = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, startScroll + scrollDelta));
            container.scrollTop = next;
          }
        } else {
          const trackWidth = container.clientWidth - TRACK_HORIZONTAL_INSET;
          const thumbWidth = parseFloat(thumb.style.width) || MIN_THUMB_SIZE;
          const thumbTravel = Math.max(0, trackWidth - thumbWidth);
          const scrollableRange = container.scrollWidth - container.clientWidth;
          if (thumbTravel > 0 && scrollableRange > 0) {
            const scrollDelta = (delta / thumbTravel) * scrollableRange;
            const next = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, startScroll + scrollDelta));
            container.scrollLeft = next;
          }
        }
        e.preventDefault();
        e.stopPropagation();
      };

      const handleEnd = () => {
        isDragging = false;
        thumb.classList.remove('active');
      };

      // ╨Ъ╨╗╨╕╨║ ╨┐╨╛ ╤В╤А╨╡╨║╤Г (╨╜╨╡ ╨┐╨╛ ╨┐╨╛╨╗╨╖╤Г╨╜╨║╤Г): ╨┐╤А╨╛╨║╤А╤Г╤В╨║╨░ ╨╜╨░ ╨╛╨┤╨╜╤Г ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Г ╨▓╨▓╨╡╤А╤Е/╨▓╨╜╨╕╨╖ ╨╕╨╗╨╕ ╨▓╨╗╨╡╨▓╨╛/╨▓╨┐╤А╨░╨▓╨╛
      const handleTrackClick = (e) => {
        if (e.target !== scrollbar) return;
        e.preventDefault();
        e.stopPropagation();

        if (isVertical) {
          const scrollableRange = container.scrollHeight - container.clientHeight;
          if (scrollableRange <= 0) return;
          const trackRect = scrollbar.getBoundingClientRect();
          const thumbRect = thumb.getBoundingClientRect();
          const clickY = (e.touches?.[0]?.clientY ?? e.clientY) - trackRect.top;
          const thumbTop = thumbRect.top - trackRect.top;
          const thumbHeight = thumbRect.height;
          const page = container.clientHeight;
          if (clickY < thumbTop) {
            container.scrollTop = Math.max(0, container.scrollTop - page);
          } else if (clickY > thumbTop + thumbHeight) {
            container.scrollTop = Math.min(scrollableRange, container.scrollTop + page);
          }
        } else {
          const scrollableRange = container.scrollWidth - container.clientWidth;
          if (scrollableRange <= 0) return;
          const trackRect = scrollbar.getBoundingClientRect();
          const thumbRect = thumb.getBoundingClientRect();
          const clickX = (e.touches?.[0]?.clientX ?? e.clientX) - trackRect.left;
          const thumbLeft = thumbRect.left - trackRect.left;
          const thumbWidth = thumbRect.width;
          const page = container.clientWidth;
          if (clickX < thumbLeft) {
            container.scrollLeft = Math.max(0, container.scrollLeft - page);
          } else if (clickX > thumbLeft + thumbWidth) {
            container.scrollLeft = Math.min(scrollableRange, container.scrollLeft + page);
          }
        }
      };

      thumb.addEventListener('mousedown', handleThumbStart);
      thumb.addEventListener('touchstart', handleThumbStart, { passive: false });
      scrollbar.addEventListener('mousedown', handleTrackClick);
      scrollbar.addEventListener('touchstart', handleTrackClick, { passive: false });
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);

      container.addEventListener('scroll', updateThumb);
      const resizeObserver = new ResizeObserver(updateThumb);
      resizeObserver.observe(container);
      const inner = container.querySelector('.canvas-container-inner');
      let innerRO = null;
      if (inner) {
        innerRO = new ResizeObserver(updateThumb);
        innerRO.observe(inner);
      }
      updateThumb();

      return () => {
        thumb.removeEventListener('mousedown', handleThumbStart);
        thumb.removeEventListener('touchstart', handleThumbStart);
        scrollbar.removeEventListener('mousedown', handleTrackClick);
        scrollbar.removeEventListener('touchstart', handleTrackClick);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
        container.removeEventListener('scroll', updateThumb);
        resizeObserver.disconnect();
        if (innerRO) innerRO.disconnect();
        scrollbar.remove();
      };
    };

    const cleanupVertical = createScrollbar(true);
    const cleanupHorizontal = createScrollbar(false);

    return () => {
      cleanupVertical();
      cleanupHorizontal();
    };
  }, [canvasState.isConnected]);


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
