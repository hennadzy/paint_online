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
import galleryIcon from '../assets/img/gallery.png';

const TopMenu = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const fileInputRef = useRef(null);
  const fileInputKey = useRef(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [clickAnimation, setClickAnimation] = useState(null);
  const [clickedButtons, setClickedButtons] = useState(new Set());

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('drawing');
  const [exportFormat, setExportFormat] = useState('png');

  // Gallery submit state
  const [showGallerySubmit, setShowGallerySubmit] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [gallerySubmitting, setGallerySubmitting] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [gallerySuccess, setGallerySuccess] = useState(false);

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
      const { username, currentRoomId: roomId, isConnected, canvas, roomError } = canvasState;

      if (roomError) {
        return;
      }

      if (!username || username === 'local' || !roomId || isConnected || !canvas) {
        return;
      }

      const token = localStorage.getItem(`room_token_${roomId}`);

      if (!token) {
        canvasState.setModalOpen(true);
        return;
      }

      try {
        await canvasState.connectToRoom(roomId, username, token);
        canvasState.setModalOpen(false);
        canvasState.setShowRoomInterface(false);
      } catch (error) {
        localStorage.removeItem(`room_token_${roomId}`);
        canvasState.setIsConnected(false);
        canvasState.setModalOpen(true);
      }
    };

    if (canvasState.currentRoomId && canvasState.usernameReady && !canvasState.isConnected) {
      connectToRoom();
    }
  }, [canvasState.usernameReady, canvasState.isConnected, canvasState.currentRoomId, canvasState.roomError]);

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

 const handleLogout = useCallback(() => {
 userState.logout();
 if (!canvasState.isConnected) {
 navigate('/');
 }
 }, [navigate]);

 const handleActionClick = useCallback((action, buttonId) => {
   action();
   setClickAnimation(buttonId);
   setClickedButtons(prev => new Set(prev).add(buttonId));
   setTimeout(() => setClickAnimation(null), 1000);
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
 href = canvas.toDataURL('image/jpeg',0.95);
 downloadName = `${filename}.jpg`;
 } else if (exportFormat === 'svg') {
 const pngData = canvas.toDataURL('image/png');
 const svgContent =
 `<?xml version="1.0" encoding="UTF-8"?>\n` +
 `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
 `width="${canvas.width}" height="${canvas.height}" viewBox="00 ${canvas.width} ${canvas.height}">\n` +
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

 if (exportFormat === 'svg') {
 setTimeout(() => URL.revokeObjectURL(href),1000);
 }

 setShowExportModal(false);
 };

  return (
    <>
      <div className="top-menu" data-nosnippet>
        <div className="top-menu__actions">
          <button type="button" className={`toolbar__btn ${clickAnimation === "undo" ? "click-animation" : ""} ${clickedButtons.has("undo") ? "clicked" : ""}`} onClick={() => handleActionClick(() => canvasState.undo(), "undo")} onMouseDown={(e) => e.target.blur()} title="Отменить (Ctrl+Z)">
            <span className="icon undo"></span>
            <span className="tooltip">Отменить (Ctrl+Z)</span>
          </button>
          <button type="button" className={`toolbar__btn ${clickAnimation === "redo" ? "click-animation" : ""} ${clickedButtons.has("redo") ? "clicked" : ""}`} onClick={() => handleActionClick(() => canvasState.redo(), "redo")} onMouseDown={(e) => e.target.blur()} title="Повторить (Ctrl+Y)">
            <span className="icon redo"></span>
            <span className="tooltip">Повторить (Ctrl+Y)</span>
          </button>

          <button type="button" className={`toolbar__btn ${clickAnimation === "save" ? "click-animation" : ""} ${clickedButtons.has("save") ? "clicked" : ""}`} onClick={() => handleActionClick(openExportModal, "save")} onMouseDown={(e) => e.target.blur()} title="Сохранить">
            <span className="icon save"></span>
            <span className="tooltip">Сохранить</span>
          </button>

          <button
            type="button"
            className={`toolbar__btn ${clickAnimation === "load" ? "click-animation" : ""} ${clickedButtons.has("load") ? "clicked" : ""}`}
            onClick={() => handleActionClick(handleUploadButtonClick, "load")}
            onMouseDown={(e) => e.target.blur()}
            title="Загрузить картинку"
          >
            <span className="icon load"></span>
            <span className="tooltip">Загрузить картинку</span>
          </button>

          <button type="button" className={`toolbar__btn ${clickAnimation === "share" ? "click-animation" : ""} ${clickedButtons.has("share") ? "clicked" : ""}`} onClick={() => handleActionClick(handleShareImage, "share")} onMouseDown={(e) => e.target.blur()} title="Поделиться рисунком">
            <span className="icon share"></span>
            <span className="tooltip">Поделиться</span>
          </button>

          {userState.isAuthenticated && (
            <button
              type="button"
              className={`toolbar__btn ${clickAnimation === "gallery" ? "click-animation" : ""} ${clickedButtons.has("gallery") ? "clicked" : ""}`}
              onClick={() => handleActionClick(() => {
                setGalleryTitle('');
                setGalleryError('');
                setGallerySuccess(false);
                setShowGallerySubmit(true);
              }, "gallery")}
              onMouseDown={(e) => e.target.blur()}
              title="Добавить в галерею"
            >
              <span className="icon" style={{ backgroundImage: `url(${galleryIcon})` }} />
              <span className="tooltip">В галерею</span>
            </button>
          )}

          <button
            type="button"
            className={`toolbar__btn ${clickAnimation === "help" ? "click-animation" : ""} ${clickedButtons.has("help") ? "clicked" : ""}`}
            onClick={() => handleActionClick(() => canvasState.setShowAboutModal(true), "help")}
            onMouseDown={(e) => e.target.blur()}
            title="Справка"
          >
            <span className="icon" style={{ backgroundImage: `url(${helpIcon})` }} />
            <span className="tooltip">Справка</span>
          </button>

          {isHome && !canvasState.isConnected && !canvasState.currentRoomId && (
            userState.isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="toolbar__btn"
                  onClick={() => { sessionStorage.setItem('profileFromRoom', '/'); navigate('/profile'); }}
                  onMouseDown={(e) => e.target.blur()}
                  title="Профиль"
                >
                  <span className="icon" style={{ backgroundImage: `url(${profileIcon})` }} />
                  <span className="tooltip">Профиль</span>
                </button>
                {['admin', 'superadmin'].includes(userState.user?.role) && (
                  <button
                    type="button"
                    className="toolbar__btn"
                    onClick={() => navigate('/admin')}
                    onMouseDown={(e) => e.target.blur()}
                    title="Админ-панель"
                  >
                    <span className="icon" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'/%3E%3C/svg%3E")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }} />
                    <span className="tooltip">Админ-панель</span>
                  </button>
                )}
<button
 type="button"
 className="toolbar__btn"
 onClick={handleLogout}
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

          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) && (
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowRoomInterface(true)}
            >
              Совместное рисование
            </button>
          )}

          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) && (
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowGamesModal(true)}
            >
              Игровые режимы
            </button>
          )}

          {(isHome && !canvasState.isConnected && !canvasState.currentRoomId) && (
            <button
              className="create-room-btn about-btn"
              onClick={() => navigate('/gallery')}
            >
              Галерея работ
            </button>
          )}

{canvasState.isConnected && (
 <>
 {userState.isAuthenticated && (
<>
<button
 type="button"
 className="toolbar__btn"
 onClick={() => { sessionStorage.setItem('profileFromRoom', window.location.pathname); navigate('/profile'); }}
 onMouseDown={(e) => e.target.blur()}
 title="Профиль"
 >
<span className="icon" style={{ backgroundImage: `url(${profileIcon})` }} />
<span className="tooltip">Профиль</span>
</button>
<button
 type="button"
 className="toolbar__btn"
 onClick={handleLogout}
 onMouseDown={(e) => e.target.blur()}
 title="Выйти"
 >
<span className="icon" style={{ backgroundImage: `url(${logoutIcon})` }} />
<span className="tooltip">Выйти</span>
</button>
</>
 )}
<button className="create-room-btn invite-btn-desktop" onClick={handleInvite} style={{ display: 'none' }}>
 Пригласить
</button>
<button
 className="create-room-btn disconnect-room-btn"
 onClick={() => {
 canvasState.setShowRoomInterface(true);
 canvasState.setShowRoomsList(true);
 canvasState.returningFromRoom = true;
 canvasState.disconnect(true);
 navigate('/');
 }}
 >
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

      {showGallerySubmit && (
        <div className="export-modal-overlay" onClick={() => { if (!gallerySubmitting) { setShowGallerySubmit(false); setGallerySuccess(false); } }}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="export-modal__title">Добавить в галерею</h3>

            {gallerySuccess ? (
              <div style={{
                background: 'rgba(40,167,69,0.12)',
                border: '1px solid rgba(40,167,69,0.3)',
                borderRadius: '8px',
                color: '#5cb85c',
                fontSize: '14px',
                padding: '16px',
                textAlign: 'center',
                lineHeight: '1.6'
              }}>
                ✅ Рисунок отправлен на рассмотрение.<br />
                Он будет добавлен в галерею после одобрения администрацией.
              </div>
            ) : (
              <>
                <div className="export-modal__field">
                  <label className="export-modal__label">Название рисунка</label>
                  <input
                    className="export-modal__input"
                    type="text"
                    value={galleryTitle}
                    maxLength={20}
                    onChange={(e) => { setGalleryTitle(e.target.value); setGalleryError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowGallerySubmit(false); }}
                    placeholder="Введите название (макс. 20 символов)"
                    autoFocus
                  />
                  <div style={{ fontSize: '12px', color: galleryTitle.length >= 20 ? '#ff4444' : galleryTitle.length >= 16 ? '#ff9500' : '#666', textAlign: 'right', marginTop: '4px' }}>
                    {galleryTitle.length}/20
                  </div>
                </div>

                {galleryError && (
                  <div style={{ background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '8px', color: '#ff6b6b', fontSize: '13px', padding: '10px 14px', textAlign: 'center' }}>
                    {galleryError}
                  </div>
                )}

                <div className="export-modal__actions">
                  <button
                    className="export-btn export-btn-primary"
                    disabled={gallerySubmitting || !galleryTitle.trim()}
                    onClick={async () => {
                      if (!galleryTitle.trim()) {
                        setGalleryError('Введите название рисунка');
                        return;
                      }
                      const canvas = canvasState.canvas;
                      if (!canvas) {
                        setGalleryError('Холст недоступен');
                        return;
                      }
                      setGallerySubmitting(true);
                      setGalleryError('');
                      try {
                        const imageData = canvas.toDataURL('image/jpeg', 0.85);
                        const token = localStorage.getItem('token');
                        await axios.post(
                          `${API_URL}/api/gallery/submit`,
                          { title: galleryTitle.trim(), imageData },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setGallerySuccess(true);
                      } catch (err) {
                        setGalleryError(err.response?.data?.error || 'Ошибка отправки');
                      } finally {
                        setGallerySubmitting(false);
                      }
                    }}
                  >
                    {gallerySubmitting ? 'Отправка...' : '🖼️ Отправить'}
                  </button>
                  <button
                    className="export-btn export-btn-secondary"
                    onClick={() => setShowGallerySubmit(false)}
                    disabled={gallerySubmitting}
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}

            {gallerySuccess && (
              <div className="export-modal__actions">
                <button className="export-btn export-btn-secondary" onClick={() => { setShowGallerySubmit(false); setGallerySuccess(false); }}>
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

