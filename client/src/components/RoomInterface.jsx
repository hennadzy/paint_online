import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import canvasState, { API_URL } from '../store/canvasState';
import '../styles/room-interface.scss';

const RoomInterface = observer(({ roomId }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [roomPassword, setRoomPassword] = useState('');
  const usernameInputRef = useRef(null);
  const navigate = useNavigate();

  const showUsernameForm = roomId && !canvasState.isConnected;

  useEffect(() => {
    if (activeTab === 'join' && !roomId) {
      fetchPublicRooms();
    }
  }, [activeTab, roomId]);

  useEffect(() => {
    if (showUsernameForm && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [showUsernameForm]);

  const fetchPublicRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms/public`);
      setPublicRooms(response.data);
    } catch (error) {
      setError('Ошибка загрузки комнат');
    }
  };

  const [error, setError] = useState('');

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      setError('Введите ваше имя');
      return;
    }
    setError('');
    
    try {
      const roomInfo = await axios.get(`${API_URL}/rooms/${roomId}/exists`);
      
      if (!roomInfo.data.exists) {
        setError('Комната не найдена');
        return;
      }
      
      if (roomInfo.data.hasPassword) {
        setPasswordPrompt({ id: roomId, name: roomInfo.data.name });
        return;
      }
      
      const tokenResponse = await axios.post(`${API_URL}/rooms/${roomId}/join-public`, {
        username: username.trim()
      });
      
      const token = tokenResponse.data.token;
      localStorage.setItem(`room_token_${roomId}`, token);
      
      canvasState.setUsername(username);
      canvasState.setModalOpen(false);
      canvasState.setShowRoomInterface(false);
    } catch (error) {
      setError('Ошибка подключения к комнате');
    }
  };

  const closeInterface = () => {
    canvasState.setShowRoomInterface(false);
    canvasState.setModalOpen(false);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }
    if (!isPublic && !password.trim()) {
      setError('Введите пароль для приватной комнаты');
      return;
    }
    setError('');
    try {
      const response = await axios.post(`${API_URL}/rooms`, {
        name: roomName,
        isPublic,
        password: !isPublic ? password : null
      });
      const { roomId } = response.data;
      const roomLink = window.location.origin + '/' + roomId;
      setCreatedRoom({ 
        id: roomId, 
        link: roomLink, 
        name: roomName, 
        isPublic, 
        password: !isPublic ? password : null 
      });
    } catch (error) {
      setError('Ошибка создания комнаты');
    }
  };

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(createdRoom.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enterCreatedRoom = async () => {
    try {
      const creatorUsername = 'creator_' + Math.random().toString(36).substring(2, 7);
      const endpoint = createdRoom.isPublic ? 'join-public' : 'join-private';
      
      const payload = {
        username: creatorUsername
      };
      
      if (!createdRoom.isPublic && createdRoom.password) {
        payload.password = createdRoom.password;
      }
      
      const tokenResponse = await axios.post(`${API_URL}/rooms/${createdRoom.id}/${endpoint}`, payload);
      
      const token = tokenResponse.data.token;
      localStorage.setItem(`room_token_${createdRoom.id}`, token);
      localStorage.setItem(`temp_username_${createdRoom.id}`, creatorUsername);
      
      navigate('/' + createdRoom.id);
      setCreatedRoom(null);
    } catch (error) {
      setError('Ошибка входа в комнату');
    }
  };

  const joinPublicRoom = async (room) => {
    if (room.hasPassword) {
      setPasswordPrompt({ id: room.id, name: room.name });
    } else {
      try {
        const guestUsername = 'guest_' + Math.random().toString(36).substring(2, 7);
        const tokenResponse = await axios.post(`${API_URL}/rooms/${room.id}/join-public`, {
          username: guestUsername
        });
        
        const token = tokenResponse.data.token;
        localStorage.setItem(`room_token_${room.id}`, token);
        localStorage.setItem(`temp_username_${room.id}`, guestUsername);
        
        navigate('/' + room.id);
      } catch (error) {
        setError('Ошибка подключения к комнате');
      }
    }
  };

  const verifyPasswordAndJoin = async () => {
    if (!roomPassword.trim()) {
      setError('Введите пароль');
      return;
    }
    
    try {
      const currentUsername = username.trim() || 'guest';
      const roomIdToJoin = passwordPrompt.id;
      
      const tokenResponse = await axios.post(`${API_URL}/rooms/${roomIdToJoin}/join-private`, {
        username: currentUsername,
        password: roomPassword
      });
      
      const token = tokenResponse.data.token;
      localStorage.setItem(`room_token_${roomIdToJoin}`, token);
      
      setPasswordPrompt(null);
      setRoomPassword('');
      setError('');
      
      if (roomId) {
        canvasState.setUsername(currentUsername);
        canvasState.setModalOpen(false);
        canvasState.setShowRoomInterface(false);
      } else {
        navigate('/' + roomIdToJoin);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Неверный пароль');
      } else {
        setError('Ошибка проверки пароля');
      }
    }
  };

  if (showUsernameForm) {
    return (
      <div className="room-interface-overlay" data-nosnippet>
        <div className="room-interface">
          <button className="room-close-btn" onClick={() => navigate('/')}>×</button>
          <div className="room-card username-form">
            <div className="room-card-header">
              <h2>Добро пожаловать!</h2>
              <p>Введите ваше имя для входа в комнату</p>
            </div>
            <div className="room-card-body">
              {error && <div className="room-error">{error}</div>}
              <input
                ref={usernameInputRef}
                type="text"
                className="room-input"
                placeholder="Ваше имя"
                value={username}
                onChange={(e) => {setUsername(e.target.value); setError('');}}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinRoom();
                }}
              />
              <button className="room-btn room-btn-primary" onClick={handleJoinRoom}>
                Войти в комнату
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canvasState.isConnected && canvasState.showRoomInterface) {
    return (
      <div className="room-interface-overlay" onClick={closeInterface} data-nosnippet>
        <div className="room-interface" onClick={(e) => e.stopPropagation()}>
          <button className="room-close-btn" onClick={closeInterface}>×</button>
          <div className="room-welcome">
            <h1>Рисуй онлайн вместе с друзьями</h1>
            <p>Создайте комнату или присоединитесь к существующей</p>
          </div>

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
          <>
            <div className="room-tabs">
              <button
                className={`room-tab ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Создать комнату
              </button>
              <button
                className={`room-tab ${activeTab === 'join' ? 'active' : ''}`}
                onClick={() => setActiveTab('join')}
              >
                Присоединиться
              </button>
            </div>

            {activeTab === 'create' ? (
              <div className="room-card">
                <div className="room-card-body">
                  {error && <div className="room-error">{error}</div>}
                  <input
                    type="text"
                    className="room-input"
                    placeholder="Название комнаты"
                    value={roomName}
                    onChange={(e) => {setRoomName(e.target.value); setError('');}}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateRoom();
                    }}
                  />
                  {!isPublic && (
                    <input
                      type="password"
                      className="room-input"
                      placeholder="Пароль для входа"
                      value={password}
                      onChange={(e) => {setPassword(e.target.value); setError('');}}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateRoom();
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
                  <button className="room-btn room-btn-primary" onClick={handleCreateRoom}>
                    Создать комнату
                  </button>
                </div>
              </div>
            ) : (
              <div className="room-card">
                <div className="room-card-body">
                  {passwordPrompt ? (
                    <div className="password-prompt">
                      <h3>Вход в комнату "{passwordPrompt.name}"</h3>
                      <p>Эта комната защищена паролем</p>
                      {error && <div className="room-error">{error}</div>}
                      <input
                        type="password"
                        className="room-input"
                        placeholder="Введите пароль"
                        value={roomPassword}
                        onChange={(e) => {setRoomPassword(e.target.value); setError('');}}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') verifyPasswordAndJoin();
                        }}
                        autoFocus
                      />
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button
                          className="room-btn room-btn-primary"
                          onClick={verifyPasswordAndJoin}
                        >
                          Войти
                        </button>
                        <button
                          className="room-btn room-btn-ghost"
                          onClick={() => {setPasswordPrompt(null); setRoomPassword(''); setError('');}}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : publicRooms.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">🎨</span>
                      <p>Нет доступных комнат</p>
                      <p className="empty-hint">Создайте первую комнату!</p>
                    </div>
                  ) : (
                    <div className="rooms-list">
                      {publicRooms.map(room => (
                        <div key={room.id} className="room-item">
                          <div className="room-item-info">
                            <span className="room-item-icon">{room.hasPassword ? '🔒' : '🎨'}</span>
                            <div className="room-item-details">
                              <h3>{room.name}</h3>
                              <span className="room-item-status">
                                {room.isPublic ? 'Публичная' : 'Приватная'}
                              </span>
                            </div>
                          </div>
                          <button
                            className="room-btn room-btn-join"
                            onClick={() => joinPublicRoom(room)}
                          >
                            Войти
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    );
  }

  return null;
});

export default RoomInterface;
