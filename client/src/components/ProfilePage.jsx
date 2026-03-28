import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { useNavigate, useLocation } from 'react-router-dom';
import RoomActionsDropdown from './RoomActionsDropdown';
import CreateRoomModal from './CreateRoomModal';
import PersonalMessagesModal from './PersonalMessagesModal';
import '../styles/profile.scss';

const EyeIcon = ({ visible, onClick }) => (
  <button
    type="button"
    className="password-toggle"
    onClick={onClick}
    tabIndex={-1}
    aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
  >
    {visible ? (
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
);

const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='80' r='40' fill='%23cccccc'/%3E%3Cpath d='M30 170 Q100 130, 170 170' stroke='%23cccccc' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

const ProfilePage = observer(() => {
 const navigate = useNavigate();
 const location = useLocation();
 const [editMode, setEditMode] = useState(false);
 const [username, setUsername] = useState('');
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [showNewPassword, setShowNewPassword] = useState(false);
 const [showCurrentPassword, setShowCurrentPassword] = useState(false);
 const [passwordError, setPasswordError] = useState('');
 const [avatarFile, setAvatarFile] = useState(null);
 const [previewUrl, setPreviewUrl] = useState(null);
 const [uploadError, setUploadError] = useState('');
 const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
 const [showPersonalMessagesModal, setShowPersonalMessagesModal] = useState(false);
 const fileInputRef = useRef(null);
 const [fromRoom, setFromRoom] = useState(null);

useEffect(() => {
 const fromRoomPath = sessionStorage.getItem('profileFromRoom');
 setFromRoom(fromRoomPath);

 if (!userState.isAuthenticated) {
 navigate('/login');
 } else {
 setUsername(userState.user?.username || '');
 userState.fetchCurrentUser();
 userState.fetchUserRooms();
 userState.fetchActivityRooms();
 }
 }, [userState.isAuthenticated, navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Файл слишком большой (макс. 2 МБ)');
        return;
      }
      setAvatarFile(file);
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
    setPasswordError('');
    try {
      await userState.updateProfile({ username });
      if (newPassword.trim()) {
        if (!currentPassword.trim()) {
          setPasswordError('Введите текущий пароль для смены пароля');
          return;
        }
        await userState.changePassword(currentPassword, newPassword);
      }
      setEditMode(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || userState.error || 'Ошибка сохранения');
    }
  };

 const handleLogout = () => {
 userState.logout();
 const fromRoom = sessionStorage.getItem('profileFromRoom');
 sessionStorage.removeItem('profileFromRoom');
 if (fromRoom) {
 navigate(fromRoom);
 } else {
 navigate('/');
 }
 };

  if (!userState.user) return (
    <div className="profile-loading">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-container">
<div className="profile-header">
<h1>Личный кабинет</h1>
<button
 className="profile-btn profile-btn-secondary"
 onClick={() => {
   sessionStorage.removeItem('profileFromRoom');
   navigate(fromRoom || '/');
 }}
 aria-label={/^\/[a-zA-Z0-9]{9}$/.test(fromRoom) ? 'В комнату' : 'На главную'}
 >
<span className="profile-back-icon" aria-hidden="true">×</span>
<span className="profile-back-text">{/^\/[a-zA-Z0-9]{9}$/.test(fromRoom) ? '← В комнату' : '← На главную'}</span>
</button>
</div>

        <div className="profile-content">
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
                  <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="profile-input"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Новый пароль"
                    />
                    <EyeIcon visible={showNewPassword} onClick={() => setShowNewPassword(!showNewPassword)} />
                  </div>
                </div>
                {newPassword.trim() && (
                  <div className="form-group">
                    <label>Текущий пароль (для смены пароля)</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="profile-input"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                        placeholder="Текущий пароль"
                      />
                      <EyeIcon visible={showCurrentPassword} onClick={() => setShowCurrentPassword(!showCurrentPassword)} />
                    </div>
                  </div>
                )}
                {passwordError && <div className="profile-error">{passwordError}</div>}
                <div className="form-actions">
                  <button className="profile-btn profile-btn-primary" onClick={handleSaveProfile}>
                    Сохранить
                  </button>
                  <button className="profile-btn profile-btn-secondary" onClick={() => { setEditMode(false); setCurrentPassword(''); setNewPassword(''); setPasswordError(''); }}>
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

            <div className="profile-actions">
              <button 
                className="profile-action-btn" 
                onClick={() => setShowCreateRoomModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>Создать комнату</span>
              </button>
              <button 
                className="profile-action-btn"
                onClick={() => setShowPersonalMessagesModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Личные сообщения</span>
              </button>
            </div>

            <div className="profile-section">
              <h2>Мои комнаты</h2>
              {userState.userRooms.length === 0 ? (
                <p className="profile-empty">Вы ещё не создали ни одной комнаты</p>
              ) : (
                <ul className="profile-list">
                  {userState.userRooms.map(room => (
                    <li key={room.id} className="profile-list-item">
                      <div className="profile-list-item-with-actions">
                        <a href={`/${room.id}`} className="room-link">{room.name}</a>
<span className={`room-badge ${room.isPublic ? 'room-badge-public' : 'room-badge-private'}`}>{room.isPublic ? 'публичная' : 'приватная'}</span>
                        <RoomActionsDropdown
                          room={room}
                          isCreator={true}
                          compact
                          onDeleted={() => userState.fetchUserRooms()}
                          onUpdated={() => userState.fetchUserRooms()}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="profile-section">
              <h2>Где я рисовал</h2>
              {userState.activityRooms.length === 0 ? (
                <p className="profile-empty">Вы ещё не участвовали ни в одной комнате</p>
              ) : (
                <ul className="profile-list">
                  {userState.activityRooms.map(room => (
                    <li key={room.id} className="profile-list-item">
                      <a href={`/${room.id}`} className="room-link">{room.name}</a>
                      <span className={`room-badge ${room.isPublic ? 'room-badge-public' : 'room-badge-private'}`}>{room.isPublic ? 'публичная' : 'приватная'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

<div className="profile-logout">
<button className="profile-btn profile-btn-secondary" onClick={handleLogout}>
Выйти из профиля
</button>
</div>
          </div>
        </div>
      </div>

      <CreateRoomModal 
        isOpen={showCreateRoomModal} 
        onClose={() => setShowCreateRoomModal(false)} 
      />
      
      <PersonalMessagesModal 
        isOpen={showPersonalMessagesModal} 
        onClose={() => setShowPersonalMessagesModal(false)} 
      />
    </div>
  );
});

export default ProfilePage;
