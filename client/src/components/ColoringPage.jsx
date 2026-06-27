import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Fill from '../tools/Fill';
import canvasState, { API_URL } from '../store/canvasState';
import { useSeo } from './SeoMeta';
import { MAIN_COLORING_SEO_PARAGRAPHS, seoDescriptionFromText } from '../data/coloringSeoTexts';
import { resolveAssetUrl } from '../utils/assetUrl';
import { computeRegionMask, drawBrushStrokeInRegion } from '../utils/coloringRegion';
import { createOpaqueCanvas } from '../utils/canvasExport';
import '../styles/coloring.scss';
import '../styles/modal.scss';

class ColoringHistory {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
  }

  push(imageData) {
    const copy = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    this.undoStack.push(copy);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(currentImageData) {
    if (this.undoStack.length === 0) return null;

    const copy = new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    );
    this.redoStack.push(copy);

    return this.undoStack.pop();
  }

  redo(currentImageData) {
    if (this.redoStack.length === 0) return null;

    const copy = new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    );
    this.undoStack.push(copy);

    return this.redoStack.pop();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

const coloringHistoryRef = { current: new ColoringHistory() };

const coloringAssetUrl = (url) => resolveAssetUrl(url);

const PRESET_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#ADFF2F', '#00CC44', '#00BFFF', '#0044FF', '#8A2BE2',
  '#FF1493', '#FF69B4', '#20B2AA', '#4169E1', '#9370DB', '#FFB3B3', '#B3E5FF', '#D4B3FF', '#C8A882',
  '#8B0000', '#556B2F', '#2F4F4F', '#4B0082', '#333333', '#000000', '#FFFFFF', '#A9A9A9', '#808080',
];

const COLORING_BRUSH_SIZE = 10;

const ColoringPage = () => {
  const navigate = useNavigate();
  const { setSeoData } = useSeo();
  const { sectionSlug, pageSlug } = useParams();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  const [coloringPages, setColoringPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [coloringSections, setColoringSections] = useState([]);
  const [currentSection, setCurrentSection] = useState(null);

  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [paintMode, setPaintMode] = useState('fill');

  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilename, setSaveFilename] = useState('coloring');
  const [saveFormat, setSaveFormat] = useState('png');

  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const initialZoomRef = useRef(1);
  const initialPanRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef(0);
  const initialCenterRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const regionMaskRef = useRef(null);
  const brushPointsRef = useRef([]);
  const finishBrushStrokeRef = useRef(() => {});
  const isPinchingRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError('');
      setSelectedPage(null);
      setImageLoaded(false);

      try {
        if (!sectionSlug) {
          const res = await fetch(`${API_URL}/api/coloring-sections`);
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to fetch sections:', res.status, errorText);
            throw new Error('Server error: ' + res.status);
          }
          const data = await res.json();
          setColoringSections(Array.isArray(data.sections) ? data.sections : []);
          setColoringPages([]);
          setCurrentSection(null);
          setIsLoading(false);
          setSeoData(null);
          return;
        }

        if (sectionSlug && !pageSlug) {
          const res = await fetch(`${API_URL}/api/coloring-sections/${encodeURIComponent(sectionSlug)}/pages`);
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to fetch pages:', res.status, errorText);
            if (res.status === 404) {
              setFetchError('Раздел не найден');
            } else {
              throw new Error('Server error: ' + res.status);
            }
            setIsLoading(false);
            return;
          }
          const data = await res.json();
          const pages = Array.isArray(data.pages) ? data.pages : [];

          setColoringPages(pages);
          setCurrentSection(data.section || null);
          if (data.section?.title) {
            const sectionText = data.section.seoText || '';
            setSeoData({
              title: `${data.section.title} — раскраски онлайн бесплатно`,
              description: seoDescriptionFromText(
                sectionText,
                `Раскраски «${data.section.title}» — бесплатно онлайн на Рисование.Онлайн`
              ),
              keywords: `раскраски ${data.section.title}, раскраски онлайн, картинки для раскрашивания, ${data.section.title} раскраска`,
              canonical: `https://risovanie.online/coloring/${encodeURIComponent(sectionSlug)}`,
            });
          } else {
            setSeoData(null);
          }
          setIsLoading(false);
          return;
        }

        if (sectionSlug && pageSlug) {
          const res = await fetch(
            `${API_URL}/api/coloring-sections/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(pageSlug)}`
          );
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to fetch page:', res.status, errorText);
            if (res.status === 404) {
              setFetchError('Раскраска не найдена');
            } else {
              setFetchError('Не удалось загрузить раскраску. Проверьте соединение с интернетом.');
            }
            setIsLoading(false);
            return;
          }
          
          const data = await res.json();
          const page = data?.page;

          if (page) {
            if (page.slug && pageSlug && page.slug !== pageSlug) {
              navigate(
                `/coloring/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(page.slug)}`,
                { replace: true }
              );
              return;
            }

            setColoringPages([page]);
            setSelectedPage(page);

            if (page.title) {
              setSeoData({
                title: `${page.title} — раскраска онлайн`,
                description: seoDescriptionFromText(
                  page.seoText,
                  `Раскраска «${page.title}» — раскрашивайте онлайн бесплатно на Рисование.Онлайн`
                ),
                keywords: `раскраска ${page.title}, раскраски онлайн, картинки для раскрашивания`,
                canonical: `https://risovanie.online/coloring/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(page.slug || pageSlug)}`,
              });
            } else {
              setSeoData(null);
            }
          } else {
            setColoringPages([]);
            setSeoData(null);
            setFetchError('Раскраска не найдена');
          }

          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/coloring-pages`);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Failed to fetch pages:', res.status, errorText);
          throw new Error('Server error: ' + res.status);
        }
        const data = await res.json();
        setColoringPages(data.pages || data || []);
        setColoringSections([]);
        setIsLoading(false);
        setSeoData(null);
      } catch (err) {
        console.error('Coloring fetch error:', err);
        setFetchError('Не удалось загрузить данные. Проверьте соединение с интернетом.');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sectionSlug, pageSlug, setSeoData, navigate]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    if (selectedPage) {
      setSeoData({
        title: `${selectedPage.title} - Раскраска онлайн`,
        description: `Раскраска "${selectedPage.title}" - раскрашивайте онлайн бесплатно на Рисование.Онлайн`,
        keywords: `раскраска ${selectedPage.title}, раскраска онлайн, раскраска бесплатно`,
      });
    } else {
      setSeoData(null);
    }
  }, [selectedPage, setSeoData]);

  useEffect(() => {
    const syncColoringLayoutClass = () => {
      const isActivePage = Boolean(selectedPage);
      const isLandscape = window.matchMedia('(max-width: 768px) and (orientation: landscape)').matches;
      document.body.classList.toggle('coloring-active-page', isActivePage);
      document.body.classList.toggle('coloring-active-landscape', isActivePage && isLandscape);

      const vv = window.visualViewport;
      if (vv) {
        const bottomInset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
        document.documentElement.style.setProperty('--coloring-vv-bottom', `${bottomInset}px`);
      } else {
        document.documentElement.style.removeProperty('--coloring-vv-bottom');
      }
    };

    syncColoringLayoutClass();
    window.addEventListener('resize', syncColoringLayoutClass);
    window.addEventListener('orientationchange', syncColoringLayoutClass);
    window.visualViewport?.addEventListener('resize', syncColoringLayoutClass);
    window.visualViewport?.addEventListener('scroll', syncColoringLayoutClass);

    return () => {
      document.body.classList.remove('coloring-active-page', 'coloring-active-landscape');
      document.documentElement.style.removeProperty('--coloring-vv-bottom');
      window.removeEventListener('resize', syncColoringLayoutClass);
      window.removeEventListener('orientationchange', syncColoringLayoutClass);
      window.visualViewport?.removeEventListener('resize', syncColoringLayoutClass);
      window.visualViewport?.removeEventListener('scroll', syncColoringLayoutClass);
    };
  }, [selectedPage]);

  const loadImageToCanvas = useCallback((page) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setImageLoaded(false);
    coloringHistoryRef.current.clear();

    setZoom(1);
    zoomRef.current = 1;
    setPanOffset({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };

    setCanUndo(false);
    setCanRedo(false);

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load coloring image');
    };

    img.src = coloringAssetUrl(page.image_url);
  }, []);

  useEffect(() => {
    if (!selectedPage) return;
    loadImageToCanvas(selectedPage);
  }, [selectedPage, loadImageToCanvas]);

  useEffect(() => {
    if (!selectedPage) return;

    const container = containerRef.current;
    if (!container) return;

    const touchOptions = { passive: false, capture: true };

    const getTouchTargets = () =>
      [container, wrapperRef.current, canvasRef.current].filter(Boolean);

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;

        setZoom((prev) => {
          const next = Math.max(0.5, Math.min(3, prev + delta));
          zoomRef.current = next;
          return next;
        });
      }
    };

    const getDistance = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (t1, t2) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        finishBrushStrokeRef.current();
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
        initialZoomRef.current = zoomRef.current;
        initialPanRef.current = { ...panRef.current };
        initialCenterRef.current = getCenter(e.touches[0], e.touches[1]);
        isPinchingRef.current = true;
        setIsPinching(true);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        if (initialDistanceRef.current === 0) {
          initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
          initialZoomRef.current = zoomRef.current;
          initialPanRef.current = { ...panRef.current };
          initialCenterRef.current = getCenter(e.touches[0], e.touches[1]);
          return;
        }

        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistanceRef.current;
        const newZoom = Math.max(0.5, Math.min(3, initialZoomRef.current * scale));
        zoomRef.current = newZoom;
        setZoom(newZoom);

        const currentCenter = getCenter(e.touches[0], e.touches[1]);
        const newPan = {
          x: initialPanRef.current.x + (currentCenter.x - initialCenterRef.current.x),
          y: initialPanRef.current.y + (currentCenter.y - initialCenterRef.current.y),
        };
        panRef.current = newPan;
        setPanOffset(newPan);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        initialDistanceRef.current = 0;
        if (e.touches.length === 0) {
          isPinchingRef.current = false;
          setIsPinching(false);
        } else {
          setTimeout(() => {
            isPinchingRef.current = false;
            setIsPinching(false);
          }, 150);
        }
      }
    };

    const targets = getTouchTargets();

    container.addEventListener('wheel', handleWheel, { passive: false });
    targets.forEach((target) => {
      target.addEventListener('touchstart', handleTouchStart, touchOptions);
      target.addEventListener('touchmove', handleTouchMove, touchOptions);
      target.addEventListener('touchend', handleTouchEnd, touchOptions);
      target.addEventListener('touchcancel', handleTouchEnd, touchOptions);
    });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      targets.forEach((target) => {
        target.removeEventListener('touchstart', handleTouchStart, touchOptions);
        target.removeEventListener('touchmove', handleTouchMove, touchOptions);
        target.removeEventListener('touchend', handleTouchEnd, touchOptions);
        target.removeEventListener('touchcancel', handleTouchEnd, touchOptions);
      });
    };
  }, [selectedPage, imageLoaded]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = Math.min(3, prev + 0.25);
      zoomRef.current = next;
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(0.5, prev - 0.25);
      zoomRef.current = next;
      return next;
    });
  }, []);

  const handleSelectPage = (page) => {
    setSelectedPage(page);
  };

  const getCanvasCoords = useCallback((canvas, clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY),
    };
  }, []);

  const pushHistorySnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    coloringHistoryRef.current.push(imageData);
    setCanUndo(coloringHistoryRef.current.canUndo());
    setCanRedo(coloringHistoryRef.current.canRedo());
  }, []);

  const handleCanvasClick = useCallback(
    (e) => {
      if (!imageLoaded || isPinching || isPinchingRef.current || paintMode !== 'fill') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);

      pushHistorySnapshot();
      Fill.staticDraw(ctx, x, y, selectedColor);
    },
    [imageLoaded, selectedColor, isPinching, paintMode, getCanvasCoords, pushHistorySnapshot]
  );

  const finishBrushStroke = useCallback(() => {
    isDrawingRef.current = false;
    regionMaskRef.current = null;
    brushPointsRef.current = [];
  }, []);

  finishBrushStrokeRef.current = finishBrushStroke;

  const handleCanvasPointerDown = useCallback(
    (e) => {
      if (!imageLoaded || isPinching || isPinchingRef.current || paintMode !== 'brush') return;
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);

      const ctx = canvas.getContext('2d');
      const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const mask = computeRegionMask(imageData, x, y);

      if (!mask.some(Boolean)) {
        return;
      }

      pushHistorySnapshot();
      regionMaskRef.current = mask;
      brushPointsRef.current = [{ x, y }];
      isDrawingRef.current = true;

      drawBrushStrokeInRegion(ctx, mask, brushPointsRef.current, selectedColor, COLORING_BRUSH_SIZE);
    },
    [imageLoaded, isPinching, paintMode, selectedColor, getCanvasCoords, pushHistorySnapshot]
  );

  const handleCanvasPointerMove = useCallback(
    (e) => {
      if (!isDrawingRef.current || paintMode !== 'brush') return;
      const canvas = canvasRef.current;
      const mask = regionMaskRef.current;
      if (!canvas || !mask) return;

      e.preventDefault();
      const ctx = canvas.getContext('2d');
      const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
      const points = brushPointsRef.current;
      const lastPoint = points[points.length - 1];

      if (lastPoint && lastPoint.x === x && lastPoint.y === y) {
        return;
      }

      points.push({ x, y });
      drawBrushStrokeInRegion(ctx, mask, points.slice(-2), selectedColor, COLORING_BRUSH_SIZE);
    },
    [paintMode, selectedColor, getCanvasCoords]
  );

  const handleCanvasPointerUp = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (canvas && e.pointerId !== undefined) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
        }
      }
      finishBrushStroke();
    },
    [finishBrushStroke]
  );

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !coloringHistoryRef.current.canUndo()) return;

    const ctx = canvas.getContext('2d');
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const prevImageData = coloringHistoryRef.current.undo(currentImageData);

    if (prevImageData) {
      ctx.putImageData(prevImageData, 0, 0);
      setCanUndo(coloringHistoryRef.current.canUndo());
      setCanRedo(coloringHistoryRef.current.canRedo());
    }
  }, []);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !coloringHistoryRef.current.canRedo()) return;

    const ctx = canvas.getContext('2d');
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextImageData = coloringHistoryRef.current.redo(currentImageData);

    if (nextImageData) {
      ctx.putImageData(nextImageData, 0, 0);
      setCanUndo(coloringHistoryRef.current.canUndo());
      setCanRedo(coloringHistoryRef.current.canRedo());
    }
  }, []);

  const handleSave = useCallback(() => {
    const defaultName = `coloring-${selectedPage?.title || 'image'}`;
    setSaveFilename(defaultName);
    setSaveFormat('png');
    setShowSaveModal(true);
  }, [selectedPage]);

  const performExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = (saveFilename || '').trim() || `coloring-${selectedPage?.title || 'image'}`;
    const exportCanvas = createOpaqueCanvas(canvas);
    if (!exportCanvas) return;

    let href;
    let downloadName;

    if (saveFormat === 'png') {
      href = exportCanvas.toDataURL('image/png');
      downloadName = `${filename}.png`;
    } else if (saveFormat === 'jpg') {
      href = exportCanvas.toDataURL('image/jpeg', 0.95);
      downloadName = `${filename}.jpg`;
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setShowSaveModal(false);
  }, [saveFilename, saveFormat, selectedPage]);

  const cameFromGamesModal = sessionStorage.getItem('cameFromGamesModal') === '1';

  const handleBackToSelector = () => {
    setSelectedPage(null);
    setImageLoaded(false);
    finishBrushStroke();

    if (pageSlug && sectionSlug) {
      navigate(`/coloring/${encodeURIComponent(sectionSlug)}`);
      return;
    }

    if (sectionSlug) {
      navigate('/coloring');
      return;
    }

    if (cameFromGamesModal) {
      sessionStorage.removeItem('cameFromGamesModal');
      canvasState.setShowGamesModal(true);
      navigate('/');
      return;
    }

    navigate('/coloring');
  };

  const renderSeoParagraphs = () => {
    const seoText = currentSection?.seoText?.trim();
    const paragraphs = seoText
      ? seoText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
      : MAIN_COLORING_SEO_PARAGRAPHS;

    return paragraphs.map((paragraph, index) => (
      <p key={`coloring-seo-${index}`}>{paragraph}</p>
    ));
  };

  if (!selectedPage) {
    const headerTitle = currentSection?.title
      ? `🎨 ${currentSection.title}`
      : sectionSlug
        ? '🎨 Раздел раскрасок'
        : '🎨 Раскраски';

    return (
      <div className="coloring-page">
        <div className="coloring-header">
          <button className="coloring-back-btn" onClick={handleBackToSelector}>
            ← Назад
          </button>
           <h1 className="coloring-header__title">{headerTitle}</h1>
         </div>

         <div className="coloring-selector">
           {isLoading ? (
             <div className="coloring-loading">
               <div className="coloring-spinner" />
               <span>Загрузка...</span>
             </div>
           ) : fetchError ? (
             <div className="coloring-empty">
               <span className="coloring-empty__icon">⚠️</span>
               <p>{fetchError}</p>
             </div>
) : !sectionSlug && coloringSections.length === 0 ? (
              <div className="coloring-empty">
                <span className="coloring-empty__icon">📂</span>
                <p>Разделы пока не добавлены</p>
                <p className="coloring-empty__hint">Администратор скоро добавит разделы</p>
              </div>
            ) : !sectionSlug ? (
              <div className="coloring-pages-list">
                <p className="coloring-selector__hint">Выберите категорию:</p>
                {coloringSections.map((section) => (
                  <div
                    key={section.id}
                    className="coloring-page-item"
                    onClick={() => navigate(`/coloring/${encodeURIComponent(section.slug)}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/coloring/${encodeURIComponent(section.slug)}`)}
                  >
                    <div className="coloring-page-item__preview">
                      {section.imageUrl ? (
                        <img
                          src={coloringAssetUrl(section.imageUrl)}
                          alt={section.title || section.slug}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML =
                              '<span class="coloring-page-item__no-img">🎨</span>';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 130,
                            height: 90,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#bbb',
                            fontWeight: 600,
                            textAlign: 'center',
                            padding: 8
                          }}
                        >
                          {section.title || section.slug}
                        </div>
                      )}
                    </div>
                    <div className="coloring-page-item__info">
                      <h3 className="coloring-page-item__title">{section.title || section.slug}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : coloringPages.length === 0 ? (
              <div className="coloring-empty">
                <span className="coloring-empty__icon">🎨</span>
                <p>Раскраски пока не добавлены</p>
                <p className="coloring-empty__hint">Администратор скоро добавит раскраски</p>
              </div>
            ) : (
             <div className="coloring-pages-list">
               <p className="coloring-selector__hint">Выберите раскраску:</p>
               {coloringPages.map((page) => {
                 const pagePathSlug = page.slug || `page-${page.id}`;
                 const openPage = () => {
                   if (sectionSlug) {
                     navigate(`/coloring/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(pagePathSlug)}`);
                   } else {
                     handleSelectPage(page);
                   }
                 };

                 return (
                 <div
                   key={page.id}
                   className="coloring-page-item"
                   onClick={openPage}
                   role="button"
                   tabIndex={0}
                   onKeyDown={(e) => e.key === 'Enter' && openPage()}
                 >
                   <div className="coloring-page-item__preview">
                     <img
                       src={coloringAssetUrl(page.thumbnail_url || page.image_url)}
                       alt={page.title}
                       onError={(e) => {
                         e.target.style.display = 'none';
                         e.target.parentElement.innerHTML =
                           '<span class="coloring-page-item__no-img">🎨</span>';
                       }}
                     />
                   </div>
                   <div className="coloring-page-item__info">
                     <h3 className="coloring-page-item__title">{page.title}</h3>
                   </div>
                 </div>
               );
               })}
             </div>
           )}

          <section className="coloring-seo-bottom" aria-label="Раскраски — описание">
            <div className="coloring-seo-bottom__text">
              {renderSeoParagraphs()}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="coloring-page coloring-page--active">
      <div className="coloring-header">
        <button className="coloring-back-btn" onClick={handleBackToSelector}>
          ← Назад
        </button>
        <h2 className="coloring-header__title">{selectedPage?.title || 'Раскраски'}</h2>
      </div>

      <div className="coloring-workspace" ref={containerRef}>
        <div
          className="coloring-canvas-wrapper"
          ref={wrapperRef}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {!imageLoaded && (
            <div className="coloring-canvas-loading">
              <div className="coloring-spinner" />
              <span>Загрузка изображения...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`coloring-canvas ${imageLoaded ? 'coloring-canvas--ready' : ''} ${paintMode === 'brush' ? 'coloring-canvas--brush' : ''}`}
            onClick={handleCanvasClick}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            willReadFrequently={true}
            style={{
              cursor: imageLoaded ? 'crosshair' : 'wait',
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      
      <div className="coloring-bottom">
        <div className="coloring-actions">
          <button className="coloring-action-btn" onClick={handleUndo} disabled={!canUndo} title="Отменить">
            <span className="coloring-action-icon">↩</span>
            <span>Отменить</span>
          </button>
          <button className="coloring-action-btn" onClick={handleRedo} disabled={!canRedo} title="Вернуть">
            <span className="coloring-action-icon">↪</span>
            <span>Вернуть</span>
          </button>
          <button
            className="coloring-action-btn coloring-action-btn--save"
            onClick={handleSave}
            title="Сохранить"
          >
            <span className="coloring-action-icon">💾</span>
            <span>Сохранить</span>
          </button>
          <button
            className="coloring-action-btn coloring-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Уменьшить масштаб"
            aria-label="Уменьшить масштаб"
          >
            <span className="coloring-action-icon">−</span>
          </button>
          <div className="coloring-zoom-info">{Math.round(zoom * 100)}%</div>
          <button
            className="coloring-action-btn coloring-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            title="Увеличить масштаб"
            aria-label="Увеличить масштаб"
          >
            <span className="coloring-action-icon">+</span>
          </button>
        </div>

        <div className="coloring-palette">
          <div className="coloring-palette__inner">
            <div className="coloring-palette__swatches">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`coloring-swatch ${selectedColor === color ? 'coloring-swatch--selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                  aria-label={`Выбрать цвет ${color}`}
                />
              ))}
            </div>
            <div className="coloring-palette__controls">
              <div className="coloring-palette__custom">
                <div
                  className="coloring-selected-preview"
                  style={{ backgroundColor: selectedColor }}
                />
                <label className="coloring-custom-label">
                  <span>Цвет:</span>
                  <input
                    type="color"
                    className="coloring-custom-input"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    title="Выбрать любой цвет"
                  />
                </label>
              </div>
              <div className="coloring-palette__tools">
                <button
                  type="button"
                  className={`coloring-tool-btn ${paintMode === 'fill' ? 'coloring-tool-btn--active' : ''}`}
                  onClick={() => setPaintMode('fill')}
                  title="Заливка"
                  aria-label="Режим заливки"
                  aria-pressed={paintMode === 'fill'}
                >
                  <span className="coloring-tool-icon coloring-tool-icon--fill" />
                </button>
                <button
                  type="button"
                  className={`coloring-tool-btn ${paintMode === 'brush' ? 'coloring-tool-btn--active' : ''}`}
                  onClick={() => setPaintMode('brush')}
                  title="Кисть"
                  aria-label="Режим кисти"
                  aria-pressed={paintMode === 'brush'}
                >
                  <span className="coloring-tool-icon coloring-tool-icon--brush" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>



      
      {showSaveModal && (
        <div className="export-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="export-modal__title">Сохранить изображение</h3>

            <div className="export-modal__field">
              <label className="export-modal__label">Имя файла</label>
              <input
                className="export-modal__input"
                type="text"
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') performExport();
                  if (e.key === 'Escape') setShowSaveModal(false);
                }}
                placeholder="Имя файла"
                autoFocus
              />
            </div>

            <div className="export-modal__field">
              <label className="export-modal__label">Формат</label>
              <div className="export-format-options">
                {[
                  { value: 'png', label: 'PNG', desc: 'Без потерь' },
                  { value: 'jpg', label: 'JPG', desc: 'Меньше размер' },
                ].map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`export-format-option ${saveFormat === value ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="saveFormat"
                      value={value}
                      checked={saveFormat === value}
                      onChange={() => setSaveFormat(value)}
                    />
                    <span className="export-format-name">{label}</span>
                    <span className="export-format-desc">{desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="export-modal__actions">
              <button className="export-btn export-btn-primary" onClick={performExport}>
                💾 Сохранить
              </button>
              <button className="export-btn export-btn-secondary" onClick={() => setShowSaveModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColoringPage;
