import React, { useState, useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import canvasState, { API_URL } from '../store/canvasState';
import userState from '../store/userState';
import '../styles/room-interface.scss';

// Таймаут для axios запросов (10 секунд)
const axiosInstance = axios.create({
  timeout: 10000
});

// Attach auth token lazily (instance was created before userState loads)
axiosInstance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

const validateUsername = (username) => {
  if (typeof username !== 'string') {
    return { valid: false, error: 'Имя должно быть текстом' };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Введите ваше имя' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Имя должно содержать минимум 2 символа' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Имя не должно превышать 30 символов' };
  }

  const invalidChars = trimmed.match(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g);
  if (invalidChars) {
    const uniqueChars = [...new Set(invalidChars)].join(', ');
    return {
      valid: false,
      error: `Недопустимые символы: ${uniqueChars}. Используйте только буквы, цифры и пробелы`
    };
  }

  const dangerousWords = ['admin', 'moderator', 'system', 'bot', 'null', 'undefined'];
  const lowerUsername = trimmed.toLowerCase();

  for (const word of dangerousWords) {
    if (lowerUsername.includes(word)) {
      return {
        valid: false,
        error: `Слово "${word}" запрещено в имени`
      };
    }
  }

  return { valid: true, username: trimmed };
};

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
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const usernameInputRef = useRef(null);
  const navigate = useNavigate();

  const passwordVerified = roomId ? localStorage.getItem(`room_password_verified_${roomId}`) : null;
  const isPrivilegedUser = Boolean(
    userState.isAuthenticated && (userState.user?.role === 'admin' || userState.user?.role === 'superadmin')
  );
  // Показывать форму ввода имени только для НЕ авторизованных пользователей
  // Для авторизованных - вход происходит автоматически
  const showUsernameForm = roomId && !canvasState.isConnected && !userState.isAuthenticated;
  
  const showRoomError = canvasState.roomError && roomId && !canvasState.isConnected;

  useEffect(() => {
    if (!roomId || !roomInfo?.exists || canvasState.isConnected || !userState.isAuthenticated || !userState.user?.username) return;
    if (roomInfo.hasPassword && !passwordVerified && !isPrivilegedUser) return;

    const profileUsername = userState.user.username.trim();
    if (profileUsername.length < 2) return;

    let cancelled = false;
    const doJoin = async () => {
      try {
        const roomInfoRes = await axiosInstance.get(`${API_URL}/rooms/${roomId}/exists`);
        if (!roomInfoRes.data.exists || cancelled) return;

        const endpoint = roomInfoRes.data.hasPassword ? 'join-private' : 'join-public';
        const payload = { username: profileUsername };
        if (roomInfoRes.data.hasPassword) {
          if (!isPrivilegedUser) {
            const tempPassword = localStorage.getItem(`temp_room_password_${roomId}`);
            if (tempPassword) {
              payload.password = tempPassword;
              localStorage.removeItem(`temp_room_password_${roomId}`);
            }
          }
        }

        const tokenResponse = await axiosInstance.post(`${API_URL}/rooms/${roomId}/${endpoint}`, payload);
        const token = tokenResponse.data.token;
        localStorage.setItem(`room_token_${roomId}`, token);
        localStorage.removeItem(`room_password_verified_${roomId}`);

        if (cancelled) return;
        canvasState.setUsername(profileUsername);
        canvasState.setModalOpen(false);
        canvasState.setShowRoomInterface(false);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.data?.error) {
          setError(err.response.data.error);
          if (String(err.response.data.error).includes('максимальное количество')) {
            setTimeout(() => navigate('/'), 3000);
          }
        } else {
          setError('Ошибка подключения к комнате');
        }
      }
    };
    doJoin();
    return () => { cancelled = true; };
  }, [roomId, roomInfo?.exists, roomInfo?.hasPassword, passwordVerified, userState.isAuthenticated, userState.user?.username, isPrivilegedUser]);

  useEffect(() => {
    if (canvasState.showRoomsList) {
      setActiveTab('join');
      setTimeout(() => {
        canvasState.setShowRoomsList(false);
      }, 0);
    }
  }, [canvasState.showRoomsList]);

  useEffect(() => {
    if (!roomId && canvasState.showRoomInterface && canvasState.showRoomsList) {
      setActiveTab('join');
    }
  }, [roomId, canvasState.showRoomInterface, canvasState.showRoomsList]);

  useEffect(() => {
    if (activeTab === 'join' && !roomId) {
      fetchPublicRooms();
      const interval = setInterval(fetchPublicRooms, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, roomId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPublicRooms = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/rooms/public`);
      const rooms = response.data || [];
      setPublicRooms(rooms);
      if (rooms.length === 0) {
        setActiveTab('create');
      }
    } catch (error) {
      setError('Ошибка загрузки комнат');
      canvasState.setShowRoomInterface(false);
    }
  }, []);

  useEffect(() => {
    if (showUsernameForm && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [showUsernameForm]);

  useEffect(() => {
    if (canvasState.roomError) {
      setError(canvasState.roomError);
      canvasState.clearRoomError();
    }
  }, [canvasState.roomError]);

  useEffect(() => {
    if (roomId && !canvasState.isConnected) {
      axiosInstance.get(`${API_URL}/rooms/${roomId}/exists`)
        .then(response => {
          if (response.data.exists) {
            setRoomInfo(response.data);
            const passwordVerified = localStorage.getItem(`room_password_verified_${roomId}`);
            // Запрашивать пароль для приватных комнат, если он не верифицирован
            // Это работает как для авторизованных, так и для неавторизованных пользователей
            if (response.data.hasPassword && !passwordVerified && !isPrivilegedUser) {
              setPasswordPrompt({ id: roomId, name: response.data.name });
            }
          } else {
            navigate('/404', { replace: true });
          }
        })
        .catch(() => navigate('/404', { replace: true }));
    }
  }, [roomId, canvasState.isConnected, navigate, isPrivilegedUser]);

  const handleJoinRoom = async () => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError('');

    try {
      const roomInfo = await axiosInstance.get(`${API_URL}/rooms/${roomId}/exists`);

      if (!roomInfo.data.exists) {
        setError('Комната не найдена');
        return;
      }

      const passwordVerified = localStorage.getItem(`room_password_verified_${roomId}`);

      if (roomInfo.data.hasPassword && !passwordVerified) {
        setPasswordPrompt({ id: roomId, name: roomInfo.data.name });
        return;
      }

      const endpoint = roomInfo.data.hasPassword ? 'join-private' : 'join-public';
      const payload = { username: username.trim() };

      if (roomInfo.data.hasPassword) {
        const tempPassword = localStorage.getItem(`temp_room_password_${roomId}`);
        if (tempPassword) {
          payload.password = tempPassword;
          localStorage.removeItem(`temp_room_password_${roomId}`);
        }
      }

      const tokenResponse = await axiosInstance.post(`${API_URL}/rooms/${roomId}/${endpoint}`, payload);

      const token = tokenResponse.data.token;
      localStorage.setItem(`room_token_${roomId}`, token);
      localStorage.removeItem(`room_password_verified_${roomId}`);

      canvasState.setUsername(username);
      canvasState.setModalOpen(false);
      canvasState.setShowRoomInterface(false);
    } catch (error) {
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        setError(errorMessage);
        
        if (errorMessage.includes('максимальное количество пользователей')) {
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } else {
        setError('Ошибка подключения к комнате');
      }
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
    if (roomName.length > 20) {
      setError('Название комнаты не может превышать 20 символов');
      return;
    }
    if (!isPublic && !password.trim()) {
      setError('Введите пароль для приватной комнаты');
      return;
    }
    setError('');
    try {
      const response = await axiosInstance.post(`${API_URL}/rooms`, {
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
  };

  const joinPublicRoom = async (room) => {
    navigate('/' + room.id);
  };

  const verifyPasswordAndJoin = async () => {
    if (!roomPassword.trim()) {
      setError('Введите пароль');
      return;
    }

    try {
      const roomIdToJoin = passwordPrompt.id;

      const response = await axiosInstance.post(`${API_URL}/rooms/${roomIdToJoin}/verify-password`, {
        password: roomPassword
      });

      if (response.data.valid) {
        localStorage.setItem(`temp_room_password_${roomIdToJoin}`, roomPassword);
        localStorage.setItem(`room_password_verified_${roomIdToJoin}`, 'true');
        setPasswordPrompt(null);
        setRoomPassword('');
        setError('');
        if (!roomId) {
          navigate('/' + roomIdToJoin);
        }
      } else {
        setError('Неверный пароль');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Неверный пароль');
      } else {
        setError('Ошибка проверки пароля');
      }
    }
  };

  if (roomId && !canvasState.isConnected && passwordPrompt) {
    return (
      <div className="room-interface-overlay input-dialog-overlay" data-nosnippet>
        <div className="room-interface input-dialog">
          <div className="room-card password-form">
            <div className="room-card-header">
              <button className="room-close-btn-inline" onClick={() => navigate('/')}>×</button>
              <h2>Вход в комнату "{passwordPrompt.name}"</h2>
              <p>Эта комната защищена паролем</p>
            </div>
            <div className="room-card-body">
              {error && <div className="room-error">{error}</div>}
              <input
                type="password"
                className="room-input"
                placeholder="Введите пароль"
                value={roomPassword}
                onChange={(e) => { setRoomPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyPasswordAndJoin();
                }}
                autoFocus
                inputMode="text"
              />
              <button className="room-btn room-btn-primary" onClick={verifyPasswordAndJoin}>
                Продолжить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showUsernameForm) {
    return (
      <div className="room-interface-overlay input-dialog-overlay" data-nosnippet>
        <div className="room-interface input-dialog">
          <div className="room-card username-form">
            <div className="room-card-header">
              <button className="room-close-btn-inline" onClick={() => navigate('/')}>×</button>
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
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinRoom();
                }}
                autoFocus
                inputMode="text"
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
      <div className="room-interface-overlay fullscreen" onClick={closeInterface} data-nosnippet>
        <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
          <button className="room-close-btn" onClick={closeInterface}>×</button>
          <div className="room-welcome">
            <h1>Рисуй онлайн вместе с друзьями</h1>
            <p>Создайте комнату или присоединитесь к существующей</p>
          </div>

          {createdRoom ? (
            <div className="room-card created-room fullscreen">
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
                      maxLength={20}
                      value={roomName}
                      onChange={(e) => { setRoomName(e.target.value); setError(''); }}
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
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
                          onChange={(e) => { setRoomPassword(e.target.value); setError(''); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') verifyPasswordAndJoin();
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="room-btn room-btn-primary"
                            onClick={verifyPasswordAndJoin}
                          >
                            Войти
                          </button>
                          <button
                            className="room-btn room-btn-ghost"
                            onClick={() => { setPasswordPrompt(null); setRoomPassword(''); setError(''); }}
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
                      <div className="rooms-list fullscreen">
                        {publicRooms.map(room => (
                          <div key={room.id} className="room-item">
                            <div className="room-item-info">
                              <div className="room-item-icon">
                                {room.thumbnailUrl ? (
                                  <img
                                    src={`${API_URL}${room.thumbnailUrl}?t=${Date.now()}`}
                                    alt={room.name}
                                    className="room-thumbnail"
                                    onError={(e) => {
                                      console.log('Image load error for:', room.thumbnailUrl);
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                    onLoad={() => console.log('Image loaded:', room.thumbnailUrl)}
                                  />
                                ) : null}
                                <span
                                  style={{ display: room.thumbnailUrl ? 'none' : 'flex' }}
                                  className="room-item-icon-fallback"
                                >
                                  {room.hasPassword ? '🔒' : '🎨'}
                                </span>
                              </div>
                              <div className="room-item-details">
                                <h3>{room.name}</h3>
                                <div className="room-item-meta">
                                  <span className="room-item-status">
                                    {room.isPublic ? 'Публичная' : 'Приватная'}
                                  </span>
                                  <span className={`room-item-online ${room.onlineCount > 0 ? 'online-active' : 'online-empty'}`}>
                                    {room.onlineCount > 0 ? '🟢' : '⚪'} {room.onlineCount} онлайн
                                  </span>
                                </div>
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
