import React, { useEffect, useRef, useState, useCallback } from 'react';
import { observer } from "mobx-react-lite";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import canvasState, { API_URL } from '../store/canvasState';
import userState from '../store/userState';
import loginIcon from '../assets/img/login.png';
import profileIcon from '../assets/img/profile.png';
import logoutIcon from '../assets/img/logout.png';
import registerIcon from '../assets/img/register.png';
import helpIcon from '../assets/img/help.png';
import exitIcon from '../assets/img/exit.png';

const TopMenu = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const fileInputRef = useRef(null);
  const fileInputKey = useRef(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('drawing');
  const [exportFormat, setExportFormat] = useState('png');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleImageUpload = useCallback((e) => {
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
      const scale = Math.min(canvasW / img.width, canvasH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const x = (canvasW - drawW) / 2;
      const y = (canvasH - drawH) / 2;

      bufferCtx.drawImage(img, x, y, drawW, drawH);
      const imageAreaData = bufferCtx.getImageData(Math.floor(x), Math.floor(y), Math.ceil(drawW), Math.ceil(drawH));
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageAreaData.width;
      tempCanvas.height = imageAreaData.height;
      tempCanvas.getContext('2d').putImageData(imageAreaData, 0, 0);
      const compressedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
      const stroke = {
        type: 'image_placeholder',
        x: Math.floor(x),
        y: Math.floor(y),
        width: Math.ceil(drawW),
        height: Math.ceil(drawH),
        imageData: compressedDataUrl,
        username: canvasState.username || 'local'
      };
      canvasState.pushStroke(stroke);
      if (canvasState.socket && canvasState.socket.readyState === WebSocket.OPEN) {
        canvasState.socket.send(JSON.stringify({
          method: "draw",
          id: canvasState.sessionId,
          username: canvasState.username,
          figure: stroke
        }));
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}, []);

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openExportModal = useCallback(() => {
    const defaultName = canvasState.sessionId || 'drawing';
    setExportFilename(defaultName);
    setExportFormat('png');
    setShowExportModal(true);
  }, []);

  const handleShareImage = useCallback(async () => {
    const canvas = canvasState.canvas;
    if (!canvas) return;

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const file = new File([blob], 'drawing.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Мой рисунок',
          text: 'Посмотрите, что я нарисовал(а) в редакторе Рисование онлайн'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Скачайте рисунок, чтобы поделиться');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log('Share failed', error);
      }
    }
  }, []);

  const handleInvite = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка скопирована в буфер обмена');
      }).catch(() => {
        alert('Не удалось скопировать ссылку');
      });
    }
  }, []);

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
          <button type="button" className="toolbar__btn" onClick={() => canvasState.undo()} onMouseDown={(e) => e.target.blur()} title="Отменить (Ctrl+Z)">
            <span className="icon undo"></span>
            <span className="tooltip">Отменить (Ctrl+Z)</span>
          </button>
          <button type="button" className="toolbar__btn" onClick={() => canvasState.redo()} onMouseDown={(e) => e.target.blur()} title="Повторить (Ctrl+Y)">
            <span className="icon redo"></span>
            <span className="tooltip">Повторить (Ctrl+Y)</span>
          </button>

          <button type="button" className="toolbar__btn" onClick={openExportModal} onMouseDown={(e) => e.target.blur()} title="Сохранить">
            <span className="icon save"></span>
            <span className="tooltip">Сохранить</span>
          </button>

          <button
            type="button"
            className="toolbar__btn"
            onClick={handleUploadButtonClick}
            onMouseDown={(e) => e.target.blur()}
            title="Загрузить картинку"
          >
            <span className="icon load"></span>
            <span className="tooltip">Загрузить картинку</span>
          </button>

          <button type="button" className="toolbar__btn" onClick={handleShareImage} onMouseDown={(e) => e.target.blur()} title="Поделиться рисунком">
            <span className="icon share"></span>
            <span className="tooltip">Поделиться</span>
          </button>

          {/* Иконка Справки */}
          <button
            type="button"
            className="toolbar__btn"
            onClick={() => canvasState.setShowAboutModal(true)}
            onMouseDown={(e) => e.target.blur()}
            title="Справка"
          >
            <span className="icon" style={{ backgroundImage: `url(${helpIcon})` }} />
            <span className="tooltip">Справка</span>
          </button>

          {/* Иконки Войти/Регистрация или Профиль/Выйти — ТОЛЬКО НА ГЛАВНОЙ */}
          {isHome && !canvasState.isConnected && !canvasState.currentRoomId && (
            userState.isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="toolbar__btn"
                  onClick={() => navigate('/profile')}
                  onMouseDown={(e) => e.target.blur()}
                  title="Профиль"
                >
                  <span className="icon" style={{ backgroundImage: `url(${profileIcon})` }} />
                  <span className="tooltip">Профиль</span>
                </button>
                <button
                  type="button"
                  className="toolbar__btn"
                  onClick={() => userState.logout()}
                  onMouseDown={(e) => e.target.blur()}
                  title="Выйти"
                >
                  <span className="icon" style={{ backgroundImage: `url(${logoutIcon})` }} />
                  <span className="tooltip">Выйти</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="toolbar__btn"
                  onClick={() => navigate('/login')}
                  onMouseDown={(e) => e.target.blur()}
                  title="Войти"
                >
                  <span className="icon" style={{ backgroundImage: `url(${loginIcon})` }} />
                  <span className="tooltip">Войти</span>
                </button>
                <button
                  type="button"
                  className="toolbar__btn"
                  onClick={() => navigate('/register')}
                  onMouseDown={(e) => e.target.blur()}
                  title="Регистрация"
                >
                  <span className="icon" style={{ backgroundImage: `url(${registerIcon})` }} />
                  <span className="tooltip">Регистрация</span>
                </button>
              </>
            )
          )}

          {/* Кнопка Совместное рисование (текстовая) */}
          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) && (
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowRoomInterface(true)}
            >
              Совместное рисование
            </button>
          )}

          {/* Кнопка Игровые режимы (текстовая) */}
          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) && (
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowGamesModal(true)}
            >
              Игровые режимы
            </button>
          )}

          {/* Кнопки для режима комнаты */}
          {canvasState.isConnected && (
            <>
              <button className="create-room-btn invite-btn-desktop" onClick={handleInvite}>
                Пригласить
              </button>
              {/* На ПК текст, на мобиле иконка */}
              <button
                className={`create-room-btn disconnect-room-btn ${windowWidth <= 768 ? 'mobile-exit' : ''}`}
                onClick={() => { 
                  canvasState.setShowRoomInterface(true); 
                  canvasState.setShowRoomsList(true); 
                  canvasState.returningFromRoom = true; 
                  canvasState.disconnect(true); 
                  navigate('/'); 
                }}
              >
                {windowWidth <= 768 ? (
                  <span className="icon" style={{ 
                    backgroundImage: `url(${exitIcon})`,
                    width: '24px',
                    height: '24px',
                    display: 'block',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'none'
                  }} />
                ) : (
                  'Выйти'
                )}
              </button>
            </>
          )}

          <input
            key={fileInputKey.current}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>
      </div>

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

