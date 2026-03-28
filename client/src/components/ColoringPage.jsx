import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fill from '../tools/Fill';
import { API_URL } from '../store/canvasState';
import '../styles/coloring.scss';
import '../styles/modal.scss';


class ColoringHistory {
 constructor() {
 this.undoStack = [];
 this.redoStack = [];
 this.maxHistory =50;
 }

 push(imageData) {

 const copy = new ImageData(
 new Uint8ClampedArray(imageData.data),
 imageData.width,
 imageData.height
 );
 this.undoStack.push(copy);
 if (this.undoStack.length > this.maxHistory) {
 this.undoStack.shift();
 }
 this.redoStack = [];
 }

 undo(currentImageData) {
 if (this.undoStack.length ===0) return null;

 const copy = new ImageData(
 new Uint8ClampedArray(currentImageData.data),
 currentImageData.width,
 currentImageData.height
 );
 this.redoStack.push(copy);

 return this.undoStack.pop();
 }

 redo(currentImageData) {
 if (this.redoStack.length ===0) return null;

 const copy = new ImageData(
 new Uint8ClampedArray(currentImageData.data),
 currentImageData.width,
 currentImageData.height
 );
 this.undoStack.push(copy);

 return this.redoStack.pop();
 }

 canUndo() {
 return this.undoStack.length >0;
 }

 canRedo() {
 return this.redoStack.length >0;
 }

 clear() {
 this.undoStack = [];
 this.redoStack = [];
 }
}

const coloringHistoryRef = { current: new ColoringHistory() };

const PRESET_COLORS = [

  '#FF0000', '#FF4500', '#FF8C00', '#FFD700',
  '#ADFF2F', '#00CC44', '#00BFFF', '#0044FF',

  '#8A2BE2', '#FF1493', '#FF69B4', '#FF6347',
  '#20B2AA', '#4169E1', '#9370DB', '#DA70D6',

  '#FFB3B3', '#FFD9B3', '#FFFACD', '#B3FFB3',
  '#B3E5FF', '#D4B3FF', '#FFB3E6', '#C8A882',

  '#8B0000', '#4B2800', '#556B2F', '#2F4F4F',
  '#1C1C8A', '#4B0082', '#333333', '#000000',

  '#FFFFFF', '#F5F5F5', '#DCDCDC', '#A9A9A9',
  '#696969', '#808080', '#F5DEB3', '#FFDAB9',
];

const ColoringPage = () => {
 const navigate = useNavigate();
 const canvasRef = useRef(null);
 const containerRef = useRef(null);
 const wrapperRef = useRef(null);

 const [coloringPages, setColoringPages] = useState([]);
 const [selectedPage, setSelectedPage] = useState(null);
 const [selectedColor, setSelectedColor] = useState('#FF0000');
 const [isLoading, setIsLoading] = useState(true);
 const [imageLoaded, setImageLoaded] = useState(false);
 const [fetchError, setFetchError] = useState('');


 const [zoom, setZoom] = useState(1);
 const [isPinching, setIsPinching] = useState(false);


 const [canUndo, setCanUndo] = useState(false);
 const [canRedo, setCanRedo] = useState(false);


 const [showSaveModal, setShowSaveModal] = useState(false);
 const [saveFilename, setSaveFilename] = useState('coloring');
 const [saveFormat, setSaveFormat] = useState('png');


 const zoomRef = useRef(1);
 const initialZoomRef = useRef(1);
 const initialDistanceRef = useRef(0);


  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      setFetchError('');
      try {
        const res = await fetch(`${API_URL}/coloring-pages`);
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        setColoringPages(data);
      } catch (err) {
        setFetchError('Не удалось загрузить список раскрасок');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPages();
  }, []);


 const loadImageToCanvas = useCallback((page) => {
 const canvas = canvasRef.current;
 if (!canvas) return;

 setImageLoaded(false);
 coloringHistoryRef.current.clear();
 setZoom(1);
 zoomRef.current = 1;
 setCanUndo(false);
 setCanRedo(false);
 const ctx = canvas.getContext('2d');
 const img = new Image();
 img.crossOrigin = 'anonymous';

 img.onload = () => {

 canvas.width = img.naturalWidth;
 canvas.height = img.naturalHeight;

 ctx.fillStyle = '#FFFFFF';
 ctx.fillRect(0,0, canvas.width, canvas.height);
 ctx.drawImage(img,0,0);
 setImageLoaded(true);
 };

 img.onerror = () => {
 console.error('Failed to load coloring image');
 };

 img.src = `${API_URL}${page.image_url}`;
 }, []);


 useEffect(() => {
 zoomRef.current = zoom;
 }, [zoom]);


 const handleWheel = useCallback((e) => {
 if (Math.abs(e.deltaY) > 0) {
 e.preventDefault();
 const delta = e.deltaY > 0 ? -0.1 : 0.1;
 setZoom(prev => {
 const next = Math.max(0.5, Math.min(3, prev + delta));
 zoomRef.current = next;
 return next;
 });
 }
 }, []);


 useEffect(() => {
 const container = containerRef.current;
 if (!container) return;

 const getDistance = (t1, t2) => {
 const dx = t2.clientX - t1.clientX;
 const dy = t2.clientY - t1.clientY;
 return Math.sqrt(dx * dx + dy * dy);
 };

 const handleTouchStart = (e) => {
 if (e.touches.length === 2) {
 e.preventDefault();
 initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
 initialZoomRef.current = zoomRef.current;
 setIsPinching(true);
 }
 };

 const handleTouchMove = (e) => {
 if (e.touches.length === 2) {
 e.preventDefault();
 if (initialDistanceRef.current === 0) {

 initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
 initialZoomRef.current = zoomRef.current;
 return;
 }
 const currentDistance = getDistance(e.touches[0], e.touches[1]);
 const scale = currentDistance / initialDistanceRef.current;
 const newZoom = Math.max(0.5, Math.min(3, initialZoomRef.current * scale));
 zoomRef.current = newZoom;
 setZoom(newZoom);
 }
 };

 const handleTouchEnd = (e) => {
 if (e.touches.length < 2) {
 initialDistanceRef.current = 0;

 setTimeout(() => setIsPinching(false), 150);
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


 const handleZoomIn = useCallback(() => {
 setZoom(prev => {
 const next = Math.min(3, prev + 0.25);
 zoomRef.current = next;
 return next;
 });
 }, []);

 const handleZoomOut = useCallback(() => {
 setZoom(prev => {
 const next = Math.max(0.5, prev - 0.25);
 zoomRef.current = next;
 return next;
 });
 }, []);

  const handleSelectPage = (page) => {
    setSelectedPage(page);

    setTimeout(() => loadImageToCanvas(page), 50);
  };

 const handleCanvasClick = useCallback((e) => {
 if (!imageLoaded || isPinching) return;
 const canvas = canvasRef.current;
 if (!canvas) return;

 const ctx = canvas.getContext('2d');
 const rect = canvas.getBoundingClientRect();
 const scaleX = canvas.width / rect.width;
 const scaleY = canvas.height / rect.height;

 const x = Math.floor((e.clientX - rect.left) * scaleX);
 const y = Math.floor((e.clientY - rect.top) * scaleY);


 const imageData = ctx.getImageData(0,0, canvas.width, canvas.height);
 coloringHistoryRef.current.push(imageData);


 setCanUndo(coloringHistoryRef.current.canUndo());
 setCanRedo(coloringHistoryRef.current.canRedo());

 Fill.staticDraw(ctx, x, y, selectedColor);
 }, [imageLoaded, selectedColor, isPinching]);


 const handleUndo = useCallback(() => {
 const canvas = canvasRef.current;
 if (!canvas || !coloringHistoryRef.current.canUndo()) return;

 const ctx = canvas.getContext('2d');
 const currentImageData = ctx.getImageData(0,0, canvas.width, canvas.height);
 const prevImageData = coloringHistoryRef.current.undo(currentImageData);

 if (prevImageData) {
 ctx.putImageData(prevImageData,0,0);

 setCanUndo(coloringHistoryRef.current.canUndo());
 setCanRedo(coloringHistoryRef.current.canRedo());
 }
 }, []);

 const handleRedo = useCallback(() => {
 const canvas = canvasRef.current;
 if (!canvas || !coloringHistoryRef.current.canRedo()) return;

 const ctx = canvas.getContext('2d');
 const currentImageData = ctx.getImageData(0,0, canvas.width, canvas.height);
 const nextImageData = coloringHistoryRef.current.redo(currentImageData);

 if (nextImageData) {
 ctx.putImageData(nextImageData,0,0);

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
 let href, downloadName;

 if (saveFormat === 'png') {
 href = canvas.toDataURL('image/png');
 downloadName = `${filename}.png`;
 } else if (saveFormat === 'jpg') {
 href = canvas.toDataURL('image/jpeg', 0.95);
 downloadName = `${filename}.jpg`;
 } else if (saveFormat === 'svg') {
 const pngData = canvas.toDataURL('image/png');
 const svgContent =
 `<?xml version="1.0" encoding="UTF-8"?>\n` +
 `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
 `width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n` +
 `<image href="${pngData}" width="${canvas.width}" height="${canvas.height}"/>\n` +
 `</svg>`;
 const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
 href = URL.createObjectURL(blob);
 downloadName = `${filename}.svg`;
 }

 const a = document.createElement('a');
 a.href = href;
 a.download = downloadName;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);

 if (saveFormat === 'svg') {
 setTimeout(() => URL.revokeObjectURL(href), 1000);
 }

 setShowSaveModal(false);
 }, [saveFilename, saveFormat, selectedPage]);

  const handleBackToSelector = () => {
    setSelectedPage(null);
    setImageLoaded(false);
  };


  if (!selectedPage) {
    return (
      <div className="coloring-page">
        <div className="coloring-header">
          <button className="coloring-back-btn" onClick={() => navigate('/')}>
            ← На главную
          </button>
          <h1 className="coloring-header__title">🎨 Раскраски</h1>
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
          ) : coloringPages.length === 0 ? (
            <div className="coloring-empty">
              <span className="coloring-empty__icon">🎨</span>
              <p>Раскраски пока не добавлены</p>
              <p className="coloring-empty__hint">Администратор скоро добавит раскраски</p>
            </div>
          ) : (
            <div className="coloring-pages-list">
              <p className="coloring-selector__hint">Выберите раскраску для начала:</p>
              {coloringPages.map(page => (
                <div
                  key={page.id}
                  className="coloring-page-item"
                  onClick={() => handleSelectPage(page)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectPage(page)}
                >
                  <div className="coloring-page-item__preview">
                    <img
                      src={`${API_URL}${page.thumbnail_url || page.image_url}`}
                      alt={page.title}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span class="coloring-page-item__no-img">🎨</span>';
                      }}
                    />
                  </div>
                  <div className="coloring-page-item__info">
                    <h3 className="coloring-page-item__title">{page.title}</h3>
                    <span className="coloring-page-item__cta">Нажмите, чтобы раскрасить →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }


 return (
<div className="coloring-page coloring-page--active">
<div className="coloring-header">
<button className="coloring-back-btn" onClick={handleBackToSelector}>
 ← К списку
</button>
<h2 className="coloring-header__title">{selectedPage.title}</h2>
</div>

<div className="coloring-workspace" ref={containerRef} onWheel={handleWheel}>
<div className="coloring-canvas-wrapper" ref={wrapperRef}>
 {!imageLoaded && (
<div className="coloring-canvas-loading">
<div className="coloring-spinner" />
<span>Загрузка изображения...</span>
</div>
 )}
<canvas
 ref={canvasRef}
 className={`coloring-canvas ${imageLoaded ? 'coloring-canvas--ready' : ''}`}
 onClick={handleCanvasClick}
 style={{
 cursor: imageLoaded ? 'crosshair' : 'wait',
 transform: `scale(${zoom})`,
 transformOrigin: 'center center'
 }}
 />
</div>
</div>

 {/* Actions Panel */}
 <div className="coloring-actions">
 <button
 className="coloring-action-btn"
 onClick={handleUndo}
 disabled={!canUndo}
 title="Отменить"
 >
 <span className="coloring-action-icon">↩</span>
 <span>Отменить</span>
 </button>
 <button
 className="coloring-action-btn"
 onClick={handleRedo}
 disabled={!canRedo}
 title="Вернуть"
 >
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
<div className="coloring-zoom-info">
 {Math.round(zoom * 100)}%
</div>
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

 {/* Color Palette */}
<div className="coloring-palette">
<div className="coloring-palette__inner">
<div className="coloring-palette__swatches">
 {PRESET_COLORS.map(color => (
<button
 key={color}
 className={`coloring-swatch ${selectedColor === color ? 'coloring-swatch--selected' : ''}`}
 style={{ backgroundColor: color }}
 onClick={() => setSelectedColor(color)}
 title={color}
 aria-label={`Цвет ${color}`}
 />
 ))}
</div>

<div className="coloring-palette__custom">
<div
 className="coloring-selected-preview"
 style={{ backgroundColor: selectedColor }}
 title={`Выбранный цвет: ${selectedColor}`}
 />
<label className="coloring-custom-label" title="Выбрать любой цвет">
<span>Другой цвет</span>
<input
 type="color"
 value={selectedColor}
 onChange={(e) => setSelectedColor(e.target.value)}
 className="coloring-custom-input"
 />
</label>
</div>
</div>
 </div>

 {/* Save Modal */}
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
           onKeyDown={(e) => { if (e.key === 'Enter') performExport(); if (e.key === 'Escape') setShowSaveModal(false); }}
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
             { value: 'svg', label: 'SVG', desc: 'Векторный' }
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
