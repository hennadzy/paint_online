// client/src/components/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { useNavigate } from 'react-router-dom';
import '../styles/profile.scss';

// SVG-силуэт человека для fallback аватара
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='80' r='40' fill='%23cccccc'/%3E%3Cpath d='M30 170 Q100 130, 170 170' stroke='%23cccccc' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

const ProfilePage = observer(() => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!userState.isAuthenticated) {
      navigate('/login');
    } else {
      setUsername(userState.user?.username || '');
      setEmail(userState.user?.email || '');
      userState.fetchUserRooms();
      userState.fetchFavorites();
    }
  }, [userState.isAuthenticated, navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Файл слишком большой (макс. 2 МБ)');
        return;
      }
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
      setUploadError('');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadError('');
    try {
      await userState.uploadAvatar(avatarFile);
      setAvatarFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setUploadError(err.message || 'Ошибка загрузки');
    }
  };

  const handleSaveProfile = async () => {
    await userState.updateProfile({ username, email });
    setEditMode(false);
  };

  const handleLogout = () => {
    userState.logout();
    navigate('/');
  };

  if (!userState.user) return (
    <div className="profile-loading">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <h1>Личный кабинет</h1>
          <button className="profile-btn profile-btn-secondary" onClick={() => navigate('/')} aria-label="На главную">
            <span className="profile-back-icon" aria-hidden="true">×</span>
            <span className="profile-back-text">← На главную</span>
          </button>
        </div>

        {/* Main content */}
        <div className="profile-content">
          {/* Left column – avatar and actions */}
          <div className="profile-left">
            <div className="profile-avatar">
              <img
                src={previewUrl || userState.user.avatar_url || defaultAvatar}
                alt="аватар"
                className="avatar-image"
              />
            </div>

            <div className="avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <button
                className="profile-btn profile-btn-primary"
                onClick={() => fileInputRef.current.click()}
              >
                Выбрать файл
              </button>
              {avatarFile && (
                <button
                  className="profile-btn profile-btn-primary"
                  onClick={handleAvatarUpload}
                >
                  Сохранить
                </button>
              )}
              {uploadError && <div className="profile-error">{uploadError}</div>}
            </div>
          </div>

          {/* Right column – information and settings */}
          <div className="profile-right">
            {editMode ? (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Имя пользователя</label>
                  <input
                    type="text"
                    className="profile-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ваше имя"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="profile-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div className="form-actions">
                  <button className="profile-btn profile-btn-primary" onClick={handleSaveProfile}>
                    Сохранить
                  </button>
                  <button className="profile-btn profile-btn-secondary" onClick={() => setEditMode(false)}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Имя:</span>
                  <span className="info-value">{userState.user.username}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{userState.user.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Дата регистрации:</span>
                  <span className="info-value">
                    {userState.user.created_at
                      ? new Date(Number(userState.user.created_at)).toLocaleDateString()
                      : 'неизвестно'}
                  </span>
                </div>
                <button className="profile-btn profile-btn-primary" onClick={() => setEditMode(true)}>
                  Редактировать профиль
                </button>
              </div>
            )}

            <hr className="profile-divider" />

            {/* My rooms */}
            <div className="profile-section">
              <h2>Мои комнаты</h2>
              {userState.userRooms.length === 0 ? (
                <p className="profile-empty">Вы ещё не создали ни одной комнаты</p>
              ) : (
                <ul className="profile-list">
                  {userState.userRooms.map(room => (
                    <li key={room.id} className="profile-list-item">
                      <a href={`/${room.id}`} className="room-link">{room.name}</a>
                      <span className="room-badge">{room.isPublic ? 'публичная' : 'приватная'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Favorites */}
            <div className="profile-section">
              <h2>Избранное</h2>
              {userState.favorites.length === 0 ? (
                <p className="profile-empty">Нет избранных комнат</p>
              ) : (
                <ul className="profile-list">
                  {userState.favorites.map(room => (
                    <li key={room.id} className="profile-list-item">
                      <a href={`/${room.id}`} className="room-link">{room.name}</a>
                      <button
                        className="profile-btn profile-btn-small"
                        onClick={() => userState.removeFavorite(room.id)}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Logout button */}
            <div className="profile-logout">
              <button className="profile-btn profile-btn-secondary" onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProfilePage;
