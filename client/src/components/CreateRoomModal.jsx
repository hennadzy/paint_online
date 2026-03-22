import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { useNavigate } from 'react-router-dom';

const CreateRoomModal = observer(({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }
    
    if (roomName.length > 20) {
      setError('Название комнаты не может превышать 20 символов');
      return;
    }
    
    if (!isPublic && !password.trim()) {
      setError('Введите пароль для приватной комнаты');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const roomId = await userState.createRoom(roomName, isPublic, password);
      const roomLink = window.location.origin + '/' + roomId;
      setCreatedRoom({
        id: roomId,
        link: roomLink,
        name: roomName,
        isPublic,
        password: !isPublic ? password : null
      });
      setIsLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || userState.error || 'Ошибка создания комнаты');
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(createdRoom.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enterCreatedRoom = () => {
    if (!createdRoom.isPublic && createdRoom.password) {
      localStorage.setItem(`temp_room_password_${createdRoom.id}`, createdRoom.password);
      localStorage.setItem(`room_password_verified_${createdRoom.id}`, 'true');
    }
    navigate('/' + createdRoom.id);
    setCreatedRoom(null);
    onClose();
  };

  return (
    <div className="room-interface-overlay" onClick={onClose} data-nosnippet>
      <div className="room-interface" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={onClose}>×</button>
        
        {createdRoom ? (
          <div className="room-card created-room">
            <div className="room-card-header">
              <h2>Комната "{createdRoom.name}" создана!</h2>
              <p>Поделитесь ссылкой с друзьями</p>
            </div>
            <div className="room-card-body">
              <div className="link-container">
                <input
                  type="text"
                  className="room-input link-input"
                  value={createdRoom.link}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <button className="room-btn room-btn-secondary" onClick={copyLink}>
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <button className="room-btn room-btn-primary" onClick={enterCreatedRoom}>
                Войти в комнату
              </button>
              <button
                className="room-btn room-btn-ghost"
                onClick={() => setCreatedRoom(null)}
              >
                Создать другую комнату
              </button>
            </div>
          </div>
        ) : (
          <div className="room-card">
            <div className="room-card-header">
              <h2>Создать комнату</h2>
              <p>Создайте комнату для совместного рисования</p>
            </div>
            <div className="room-card-body">
              {error && <div className="room-error">{error}</div>}
              <input
                type="text"
                className="room-input"
                placeholder="Название комнаты"
                maxLength={20}
                value={roomName}
                onChange={(e) => { setRoomName(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRoom(e);
                }}
              />
              {!isPublic && (
                <input
                  type="password"
                  className="room-input"
                  placeholder="Пароль для входа"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRoom(e);
                  }}
                />
              )}
              <div className="privacy-options">
                <label className={`privacy-option ${isPublic ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="privacy"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <span className="privacy-icon">🌍</span>
                  <span className="privacy-label">Публичная</span>
                  <span className="privacy-desc">Свободный вход</span>
                </label>
                <label className={`privacy-option ${!isPublic ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="privacy"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <span className="privacy-icon">🔒</span>
                  <span className="privacy-label">Приватная</span>
                  <span className="privacy-desc">Вход по паролю</span>
                </label>
              </div>
              <button 
                className="room-btn room-btn-primary" 
                onClick={handleCreateRoom}
                disabled={isLoading}
              >
                {isLoading ? 'Создание...' : 'Создать комнату'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CreateRoomModal;
