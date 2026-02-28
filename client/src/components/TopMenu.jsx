import React, { useEffect, useRef, useState } from 'react';
import { observer } from "mobx-react-lite";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import canvasState, { API_URL } from '../store/canvasState';

const TopMenu = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const fileInputRef = useRef(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('drawing');
  const [exportFormat, setExportFormat] = useState('png');

  useEffect(() => {
    if (canvasState.currentRoomId && !canvasState.isConnected && !canvasState.modalOpen) {
      const timer = setTimeout(() => {
        axios.get(`${API_URL}/rooms/${canvasState.currentRoomId}/exists`)
          .then(response => {
            if (response.data.exists) {
              canvasState.setModalOpen(true);
            } else {
              navigate('/404', { replace: true });
            }
          })
          .catch(() => navigate('/404', { replace: true }));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [canvasState.currentRoomId, navigate]);

  useEffect(() => {
    const connectToRoom = async () => {
      const { username, currentRoomId: roomId, isConnected, canvas } = canvasState;
      
      if (!username || username === 'local' || !roomId || isConnected || !canvas) {
        return;
      }
      
      const token = localStorage.getItem(`room_token_${roomId}`);
      
      if (!token) {
        canvasState.setModalOpen(true);
        return;
      }
      
      canvasState.setModalOpen(false);
      canvasState.setShowRoomInterface(false);
      
      try {
        await canvasState.connectToRoom(roomId, username, token);
      } catch (error) {
        localStorage.removeItem(`room_token_${roomId}`);
        canvasState.setIsConnected(false);
        canvasState.setModalOpen(true);
      }
    };

    if (canvasState.currentRoomId && canvasState.usernameReady && !canvasState.isConnected) {
      connectToRoom();
    }
  }, [canvasState.usernameReady, canvasState.isConnected, canvasState.currentRoomId]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !canvasState.canvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasState.canvas;
        const bufferCtx = canvasState.bufferCtx;
        if (!bufferCtx) return;

        const canvasW = canvas.width;
        const canvasH = canvas.height;

        // Scale to fit within canvas (object-fit: contain), centered — no distortion
        const scale = Math.min(canvasW / img.width, canvasH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const x = (canvasW - drawW) / 2;
        const y = (canvasH - drawH) / 2;

        bufferCtx.drawImage(img, x, y, drawW, drawH);

        // Capture full buffer state and push as fill_image stroke (integrates with undo history)
        const imageData = bufferCtx.getImageData(0, 0, canvasW, canvasH);
        canvasState.pushStroke({
          type: 'fill_image',
          imageData,
          username: canvasState.username || 'local'
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-uploaded
    e.target.value = '';
  };

  const openExportModal = () => {
    const defaultName = canvasState.sessionId || 'drawing';
    setExportFilename(defaultName);
    setExportFormat('png');
    setShowExportModal(true);
  };

  const performExport = () => {
    const canvas = canvasState.canvas;
    if (!canvas) return;

    const filename = (exportFilename || '').trim() || canvasState.sessionId || 'drawing';
    let href, downloadName;

    if (exportFormat === 'png') {
      href = canvas.toDataURL('image/png');
      downloadName = `${filename}.png`;
    } else if (exportFormat === 'jpg') {
      href = canvas.toDataURL('image/jpeg', 0.95);
      downloadName = `${filename}.jpg`;
    } else if (exportFormat === 'svg') {
      const pngData = canvas.toDataURL('image/png');
      const svgContent =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n` +
        `  <image href="${pngData}" width="${canvas.width}" height="${canvas.height}"/>\n` +
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

    if (exportFormat === 'svg') {
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }

    setShowExportModal(false);
  };

  return (
    <>
      <div className="top-menu" data-nosnippet>
        <div className="top-menu__actions">
          <button className="toolbar__btn" onClick={() => canvasState.undo()}>
            <span className="icon undo"></span>
          </button>
          <button className="toolbar__btn" onClick={() => canvasState.redo()}>
            <span className="icon redo"></span>
          </button>

          {/* Save / Export button */}
          <button className="toolbar__btn" onClick={openExportModal} title="Сохранить">
            <span className="icon save"></span>
            <span className="tooltip">Сохранить</span>
          </button>

          {/* Upload image button */}
          <button
            className="toolbar__btn upload-img-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Загрузить картинку"
          >
            <svg
              width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
              <polyline points="14 3 14 8 19 8"/>
            </svg>
            <span className="tooltip">Загрузить картинку</span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />

          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) ? (
            <>
              <button
                className="create-room-btn"
                onClick={() => canvasState.setShowRoomInterface(true)}
              >
                Совместное рисование
              </button>
              <button
                className="create-room-btn about-btn"
                onClick={() => canvasState.setShowAboutModal(true)}
              >
                О программе
              </button>
              <button
                className="create-room-btn about-btn"
                onClick={() => canvasState.setShowFeedbackModal(true)}
              >
                Обратная связь
              </button>
            </>
          ) : canvasState.isConnected && (
            <button
              className="create-room-btn disconnect-room-btn"
              onClick={() => { canvasState.disconnect(); navigate('/'); }}
            >
              Выйти из комнаты
            </button>
          )}
        </div>
      </div>

      {/* Export modal */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="export-modal__title">Сохранить изображение</h3>

            <div className="export-modal__field">
              <label className="export-modal__label">Имя файла</label>
              <input
                className="export-modal__input"
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') performExport(); if (e.key === 'Escape') setShowExportModal(false); }}
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
                    className={`export-format-option ${exportFormat === value ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={value}
                      checked={exportFormat === value}
                      onChange={() => setExportFormat(value)}
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
              <button className="export-btn export-btn-secondary" onClick={() => setShowExportModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default TopMenu;
