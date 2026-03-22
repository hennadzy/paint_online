import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { useNavigate } from 'react-router-dom';

const CreateRoomModal = observer(({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }
    
    if (!isPublic && !password.trim()) {
      setError('Для приватной комнаты необходим пароль');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const roomId = await userState.createRoom(roomName, isPublic, password);
      setIsLoading(false);
      onClose();
      navigate(`/${roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || userState.error || 'Ошибка создания комнаты');
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Создать комнату</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label htmlFor="roomName">Название комнаты</label>
            <input
              type="text"
              id="roomName"
              className="profile-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Введите название комнаты"
              maxLength={20}
            />
          </div>
          
          <div className="form-group">
            <label>Тип комнаты</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="roomType"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                />
                Публичная (доступна всем)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="roomType"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                />
                Приватная (с паролем)
              </label>
            </div>
          </div>
          
          {!isPublic && (
            <div className="form-group">
              <label htmlFor="roomPassword">Пароль</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="roomPassword"
                  className="profile-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль для комнаты"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {error && <div className="profile-error">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="profile-btn profile-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Создание...' : 'Создать комнату'}
            </button>
            <button 
              type="button" 
              className="profile-btn profile-btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default CreateRoomModal;
