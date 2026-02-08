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

  useEffect(() => {
    if (window.innerWidth > 768) return;
    if (initialMobileZoomDone.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      initialMobileZoomDone.current = true;
      const availableW = container.clientWidth - 20;
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
    const cancelDrawing = () => {
      if (toolState.tool && toolState.tool.mouseDown) {
        const tool = toolState.tool;
        tool.mouseDown = false;
        canvasState.isDrawing = false;
        if (tool.points) tool.points.length = 0;
        if (tool.startX !== undefined) tool.startX = undefined;
        if (tool.startY !== undefined) tool.startY = undefined;
        canvasState.redrawCanvas();
      }
    };

    const handleTouchStart = (e) => {
      activeTouches = e.touches.length;
      if (e.touches.length === 2) {
        e.preventDefault();
        cancelDrawing();
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
        cancelDrawing();
        isPinching.current = true;
      }
    };

    const handleTouchMove = (e) => {
      const touchCount = e.touches.length;
      
      if (touchCount >= 2) {
        e.preventDefault();
        cancelDrawing();
        isPinching.current = true;
        
        if (touchCount === 2 && initialDistance > 0) {
          const currentDistance = getDistance(e.touches[0], e.touches[1]);
          const currentCenter = getPinchCenter(e.touches[0], e.touches[1]);
          const containerRect = container.getBoundingClientRect();
          const translationX = currentCenter.x - initialCenterX;
          const translationY = currentCenter.y - initialCenterY;
          const pannedScrollLeft = initialScrollLeft - translationX;
          const pannedScrollTop = initialScrollTop - translationY;

          const scale = currentDistance / initialDistance;
          const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
          const viewportX = currentCenter.x - containerRect.left;
          const viewportY = currentCenter.y - containerRect.top;
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

  useEffect(() => {
    if (window.innerWidth > 768) return;
    const apply = () => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth - 20;
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


useEffect(() => {
  const container = containerRef.current;
  if (!container || window.innerWidth > 768) return;

  const TRACK_VERTICAL_INSET = 20;
  const TRACK_HORIZONTAL_INSET = 20;
  const MIN_THUMB_SIZE = 24;
  const getVerticalCornerGap = () => 0;

  // Функция обновления скроллбаров
  const updateScrollbars = () => {
    if (!verticalScrollbar || !horizontalScrollbar || !container) return;
    
    // Обновляем вертикальный скроллбар
    const rect = container.getBoundingClientRect();
    
    // Вертикальный скроллбар
    const cornerGap = getVerticalCornerGap();
    const maxTrackBottom = window.innerHeight - TRACK_VERTICAL_INSET;
    const trackHeight = Math.min(
      rect.height - TRACK_VERTICAL_INSET - cornerGap,
      Math.max(0, maxTrackBottom - rect.top)
    );
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollableRange = Math.max(0, scrollHeight - clientHeight);
    const hasScroll = scrollableRange > 0;
    
    verticalScrollbar.style.display = hasScroll ? 'block' : 'none';
    verticalScrollbar.style.top = `${rect.top}px`;
    verticalScrollbar.style.height = `${trackHeight}px`;

    if (hasScroll) {
      const thumbHeight = Math.max(
        MIN_THUMB_SIZE,
        (clientHeight / scrollHeight) * trackHeight
      );
      const thumbTravel = Math.max(0, trackHeight - thumbHeight);
      const scrollRatio = scrollableRange > 0 ? container.scrollTop / scrollableRange : 0;
      const thumbTop = thumbTravel * scrollRatio;

      verticalThumb.style.height = `${thumbHeight}px`;
      verticalThumb.style.top = `${thumbTop}px`;
    }

    // Горизонтальный скроллбар
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const horizontalScrollableRange = Math.max(0, scrollWidth - clientWidth);
    const hasHorizontalScroll = horizontalScrollableRange > 0;
    
    horizontalScrollbar.style.display = hasHorizontalScroll ? 'block' : 'none';
    horizontalScrollbar.style.left = `${rect.left}px`;
    horizontalScrollbar.style.width = `${rect.width - TRACK_HORIZONTAL_INSET}px`;
    horizontalScrollbar.style.top = `${Math.min(rect.bottom - 20, window.innerHeight - 20)}px`;
    horizontalScrollbar.style.height = '20px';

    if (hasHorizontalScroll) {
      const trackWidth = rect.width - TRACK_HORIZONTAL_INSET;
      const thumbWidth = Math.max(
        MIN_THUMB_SIZE,
        (clientWidth / scrollWidth) * trackWidth
      );
      const thumbTravel = Math.max(0, trackWidth - thumbWidth);
      const scrollRatio = horizontalScrollableRange > 0 ? container.scrollLeft / horizontalScrollableRange : 0;
      const thumbLeft = thumbTravel * scrollRatio;

      horizontalThumb.style.width = `${thumbWidth}px`;
      horizontalThumb.style.left = `${thumbLeft}px`;
    }
  };

  // Создаем скроллбары
  const verticalScrollbar = document.createElement('div');
  verticalScrollbar.className = 'custom-scrollbar vertical';
  const verticalThumb = document.createElement('div');
  verticalThumb.className = 'custom-scrollbar-thumb';
  verticalScrollbar.appendChild(verticalThumb);
  document.body.appendChild(verticalScrollbar);

  const horizontalScrollbar = document.createElement('div');
  horizontalScrollbar.className = 'custom-scrollbar horizontal';
  const horizontalThumb = document.createElement('div');
  horizontalThumb.className = 'custom-scrollbar-thumb';
  horizontalScrollbar.appendChild(horizontalThumb);
  document.body.appendChild(horizontalScrollbar);

  let isVerticalDragging = false;
  let isHorizontalDragging = false;
  let verticalStartPos = 0;
  let verticalStartScroll = 0;
  let horizontalStartPos = 0;
  let horizontalStartScroll = 0;

  // Обработчики для вертикального скроллбара
  const handleVerticalThumbStart = (e) => {
    isVerticalDragging = true;
    const touch = e.touches?.[0];
    verticalStartPos = touch?.clientY ?? e.clientY;
    verticalStartScroll = container.scrollTop;
    verticalThumb.classList.add('active');
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVerticalMove = (e) => {
    if (!isVerticalDragging) return;
    const touch = e.touches?.[0];
    const currentPos = touch?.clientY ?? e.clientY;
    const delta = currentPos - verticalStartPos;

    const trackHeight = container.clientHeight - TRACK_VERTICAL_INSET - getVerticalCornerGap();
    const thumbHeight = parseFloat(verticalThumb.style.height) || MIN_THUMB_SIZE;
    const thumbTravel = Math.max(0, trackHeight - thumbHeight);
    const scrollableRange = container.scrollHeight - container.clientHeight;
    
    if (thumbTravel > 0 && scrollableRange > 0) {
      const scrollDelta = (delta / thumbTravel) * scrollableRange;
      const next = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, verticalStartScroll + scrollDelta));
      container.scrollTop = next;
      updateScrollbars();
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVerticalEnd = () => {
    isVerticalDragging = false;
    verticalThumb.classList.remove('active');
  };

  const handleVerticalTrackClick = (e) => {
    if (e.target !== verticalScrollbar) return;
    e.preventDefault();
    e.stopPropagation();

    const scrollableRange = container.scrollHeight - container.clientHeight;
    if (scrollableRange <= 0) return;
    
    const trackRect = verticalScrollbar.getBoundingClientRect();
    const thumbRect = verticalThumb.getBoundingClientRect();
    const clickY = (e.touches?.[0]?.clientY ?? e.clientY) - trackRect.top;
    const thumbTop = thumbRect.top - trackRect.top;
    const thumbHeight = thumbRect.height;
    const page = container.clientHeight;
    
    if (clickY < thumbTop) {
      container.scrollTop = Math.max(0, container.scrollTop - page);
    } else if (clickY > thumbTop + thumbHeight) {
      container.scrollTop = Math.min(scrollableRange, container.scrollTop + page);
    }
    updateScrollbars();
  };

  // Обработчики для горизонтального скроллбара
  const handleHorizontalThumbStart = (e) => {
    isHorizontalDragging = true;
    const touch = e.touches?.[0];
    horizontalStartPos = touch?.clientX ?? e.clientX;
    horizontalStartScroll = container.scrollLeft;
    horizontalThumb.classList.add('active');
    e.preventDefault();
    e.stopPropagation();
  };

  const handleHorizontalMove = (e) => {
    if (!isHorizontalDragging) return;
    const touch = e.touches?.[0];
    const currentPos = touch?.clientX ?? e.clientX;
    const delta = currentPos - horizontalStartPos;

    const trackWidth = container.clientWidth - TRACK_HORIZONTAL_INSET;
    const thumbWidth = parseFloat(horizontalThumb.style.width) || MIN_THUMB_SIZE;
    const thumbTravel = Math.max(0, trackWidth - thumbWidth);
    const scrollableRange = container.scrollWidth - container.clientWidth;
    
    if (thumbTravel > 0 && scrollableRange > 0) {
      const scrollDelta = (delta / thumbTravel) * scrollableRange;
      const next = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, horizontalStartScroll + scrollDelta));
      container.scrollLeft = next;
      updateScrollbars();
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const handleHorizontalEnd = () => {
    isHorizontalDragging = false;
    horizontalThumb.classList.remove('active');
  };

  const handleHorizontalTrackClick = (e) => {
    if (e.target !== horizontalScrollbar) return;
    e.preventDefault();
    e.stopPropagation();

    const scrollableRange = container.scrollWidth - container.clientWidth;
    if (scrollableRange <= 0) return;
    
    const trackRect = horizontalScrollbar.getBoundingClientRect();
    const thumbRect = horizontalThumb.getBoundingClientRect();
    const clickX = (e.touches?.[0]?.clientX ?? e.clientX) - trackRect.left;
    const thumbLeft = thumbRect.left - trackRect.left;
    const thumbWidth = thumbRect.width;
    const page = container.clientWidth;
    
    if (clickX < thumbLeft) {
      container.scrollLeft = Math.max(0, container.scrollLeft - page);
    } else if (clickX > thumbLeft + thumbWidth) {
      container.scrollLeft = Math.min(scrollableRange, container.scrollLeft + page);
    }
    updateScrollbars();
  };

  // Навешиваем обработчики
  verticalThumb.addEventListener('mousedown', handleVerticalThumbStart);
  verticalThumb.addEventListener('touchstart', handleVerticalThumbStart, { passive: false });
  verticalScrollbar.addEventListener('mousedown', handleVerticalTrackClick);
  verticalScrollbar.addEventListener('touchstart', handleVerticalTrackClick, { passive: false });

  horizontalThumb.addEventListener('mousedown', handleHorizontalThumbStart);
  horizontalThumb.addEventListener('touchstart', handleHorizontalThumbStart, { passive: false });
  horizontalScrollbar.addEventListener('mousedown', handleHorizontalTrackClick);
  horizontalScrollbar.addEventListener('touchstart', handleHorizontalTrackClick, { passive: false });

  document.addEventListener('mousemove', (e) => {
    if (isVerticalDragging) handleVerticalMove(e);
    if (isHorizontalDragging) handleHorizontalMove(e);
  });
  
  document.addEventListener('touchmove', (e) => {
    if (isVerticalDragging) handleVerticalMove(e);
    if (isHorizontalDragging) handleHorizontalMove(e);
  }, { passive: false });

  document.addEventListener('mouseup', () => {
    handleVerticalEnd();
    handleHorizontalEnd();
  });
  
  document.addEventListener('touchend', () => {
    handleVerticalEnd();
    handleHorizontalEnd();
  });

  // Обновляем скроллбары при изменениях
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateScrollbars);
  });
  resizeObserver.observe(container);
  
  const inner = container.querySelector('.canvas-container-inner');
  if (inner) {
    resizeObserver.observe(inner);
  }

  // Обновляем при скролле
  const handleScroll = () => {
    requestAnimationFrame(updateScrollbars);
  };
  container.addEventListener('scroll', handleScroll);

  // Обновляем при изменении зума
  const updateOnZoom = () => {
    requestAnimationFrame(() => {
      setTimeout(updateScrollbars, 50);
      setTimeout(updateScrollbars, 150);
    });
  };
  
  // Подписываемся на изменения зума
  const canvasService = canvasState;
  const originalSetZoom = canvasService.setZoom;
  canvasService.setZoom = function(zoom) {
    const result = originalSetZoom.call(this, zoom);
    updateOnZoom();
    return result;
  };

  // Инициализация
  updateScrollbars();
  
  // Периодическое обновление для надежности
  const intervalId = setInterval(updateScrollbars, 1000);

  // Очистка
  return () => {
    clearInterval(intervalId);
    
    verticalThumb.removeEventListener('mousedown', handleVerticalThumbStart);
    verticalThumb.removeEventListener('touchstart', handleVerticalThumbStart);
    verticalScrollbar.removeEventListener('mousedown', handleVerticalTrackClick);
    verticalScrollbar.removeEventListener('touchstart', handleVerticalTrackClick);
    
    horizontalThumb.removeEventListener('mousedown', handleHorizontalThumbStart);
    horizontalThumb.removeEventListener('touchstart', handleHorizontalThumbStart);
    horizontalScrollbar.removeEventListener('mousedown', handleHorizontalTrackClick);
    horizontalScrollbar.removeEventListener('touchstart', handleHorizontalTrackClick);
    
    document.removeEventListener('mousemove', handleVerticalMove);
    document.removeEventListener('touchmove', handleVerticalMove);
    document.removeEventListener('mousemove', handleHorizontalMove);
    document.removeEventListener('touchmove', handleHorizontalMove);
    document.removeEventListener('mouseup', handleVerticalEnd);
    document.removeEventListener('touchend', handleVerticalEnd);
    document.removeEventListener('mouseup', handleHorizontalEnd);
    document.removeEventListener('touchend', handleHorizontalEnd);
    
    container.removeEventListener('scroll', handleScroll);
    resizeObserver.disconnect();
    
    verticalScrollbar.remove();
    horizontalScrollbar.remove();
    
    // Восстанавливаем оригинальный метод
    if (canvasService.setZoom === canvasService.setZoom) {
      canvasService.setZoom = originalSetZoom;
    }
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
