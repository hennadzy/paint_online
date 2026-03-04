// client/src/components/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { useNavigate } from 'react-router-dom';

const ProfilePage = observer(() => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (avatarFile) {
      await userState.uploadAvatar(avatarFile);
      setAvatarFile(null);
      setPreviewUrl(null);
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

  if (!userState.user) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h1>Профиль</h1>
      <div className="profile-avatar">
        <img src={previewUrl || userState.user.avatar_url || '/default-avatar.png'} alt="avatar" />
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
        {avatarFile && <button onClick={handleAvatarUpload}>Загрузить</button>}
      </div>

      {editMode ? (
        <div className="profile-edit">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Имя пользователя"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <button onClick={handleSaveProfile}>Сохранить</button>
          <button onClick={() => setEditMode(false)}>Отмена</button>
        </div>
      ) : (
        <div className="profile-info">
          <p><strong>Имя:</strong> {userState.user.username}</p>
          <p><strong>Email:</strong> {userState.user.email}</p>
          <p><strong>Дата регистрации:</strong> {new Date(userState.user.created_at).toLocaleDateString()}</p>
          <button onClick={() => setEditMode(true)}>Редактировать</button>
        </div>
      )}

      <div className="profile-rooms">
        <h2>Мои комнаты</h2>
        <ul>
          {userState.userRooms.map(room => (
            <li key={room.id}>
              <a href={`/${room.id}`}>{room.name}</a> ({room.isPublic ? 'публичная' : 'приватная'})
            </li>
          ))}
        </ul>
      </div>

      <div className="profile-favorites">
        <h2>Избранное</h2>
        <ul>
          {userState.favorites.map(room => (
            <li key={room.id}>
              <a href={`/${room.id}`}>{room.name}</a>
              <button onClick={() => userState.removeFavorite(room.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={handleLogout} className="logout-btn">Выйти</button>
    </div>
  );
});

export default ProfilePage;
