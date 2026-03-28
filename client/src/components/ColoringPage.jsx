import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fill from '../tools/Fill';
import { API_URL } from '../store/canvasState';
import '../styles/coloring.scss';

const PRESET_COLORS = [
  // Row 1 — warm / primary
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700',
  '#ADFF2F', '#00CC44', '#00BFFF', '#0044FF',
  // Row 2 — cool / secondary
  '#8A2BE2', '#FF1493', '#FF69B4', '#FF6347',
  '#20B2AA', '#4169E1', '#9370DB', '#DA70D6',
  // Row 3 — light / pastel
  '#FFB3B3', '#FFD9B3', '#FFFACD', '#B3FFB3',
  '#B3E5FF', '#D4B3FF', '#FFB3E6', '#C8A882',
  // Row 4 — dark / neutral
  '#8B0000', '#4B2800', '#556B2F', '#2F4F4F',
  '#1C1C8A', '#4B0082', '#333333', '#000000',
  // Row 5 — grays / whites
  '#FFFFFF', '#F5F5F5', '#DCDCDC', '#A9A9A9',
  '#696969', '#808080', '#F5DEB3', '#FFDAB9',
];

const ColoringPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [coloringPages, setColoringPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Fetch available coloring pages on mount
  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      setFetchError('');
      try {
        const res = await fetch(`${API_URL}/api/coloring-pages`);
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

  // Load selected image onto canvas
  const loadImageToCanvas = useCallback((page) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setImageLoaded(false);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Set canvas to natural image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      // Fill white background first so flood fill works on transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load coloring image');
    };

    img.src = `${API_URL}${page.image_url}`;
  }, []);

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    // Give React a tick to render the canvas before drawing
    setTimeout(() => loadImageToCanvas(page), 50);
  };

  const handleCanvasClick = useCallback((e) => {
    if (!imageLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    Fill.staticDraw(ctx, x, y, selectedColor);
  }, [imageLoaded, selectedColor]);

  const handleBackToSelector = () => {
    setSelectedPage(null);
    setImageLoaded(false);
  };

  // ─── Selector View ────────────────────────────────────────────────────────
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

  // ─── Coloring View ────────────────────────────────────────────────────────
  return (
    <div className="coloring-page coloring-page--active">
      <div className="coloring-header">
        <button className="coloring-back-btn" onClick={handleBackToSelector}>
          ← К списку
        </button>
        <h2 className="coloring-header__title">{selectedPage.title}</h2>
      </div>

      <div className="coloring-workspace" ref={containerRef}>
        <div className="coloring-canvas-wrapper">
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
            style={{ cursor: imageLoaded ? 'crosshair' : 'wait' }}
          />
        </div>
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
    </div>
  );
};

export default ColoringPage;
