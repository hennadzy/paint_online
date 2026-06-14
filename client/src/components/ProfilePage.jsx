import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import canvasState from '../store/canvasState';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import RoomActionsDropdown from './RoomActionsDropdown';
import PersonalMessagesModal from './PersonalMessagesModal';
import SocialHeader from './SocialHeader';
import FriendActions from './FriendActions';
import { useSeo } from './SeoMeta';
import { API_URL } from '../store/canvasState';
import '../styles/profile.scss';
import '../styles/friends.scss';

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

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='80' r='40' fill='%23cccccc'/%3E%3Cpath d='M30 170 Q100 130, 170 170' stroke='%23cccccc' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";
const BIO_MAX_LENGTH = 500;

export const ProfileRedirect = observer(() => {
  if (!userState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (userState.user?.id) {
    return <Navigate to={`/user/${userState.user.id}`} replace />;
  }
  return (
    <div className="profile-loading">
      <div className="spinner" />
    </div>
  );
});

const ProfilePage = observer(() => {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const { setSeoData } = useSeo();
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [showPersonalMessagesModal, setShowPersonalMessagesModal] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState(null);
  const [fromRoom, setFromRoom] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [publicProfile, setPublicProfile] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState({ status: 'none' });
  const [wallDrawings, setWallDrawings] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [likingId, setLikingId] = useState(null);
  const [bio, setBio] = useState('');

  const fileInputRef = useRef(null);
  const isOwnProfile = userState.isAuthenticated && routeUserId === userState.user?.id;

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const loadWall = useCallback(async (userId) => {
    setWallLoading(true);
    if (isOwnProfile) {
      await userState.fetchGalleryDrawings();
      setWallDrawings([...userState.galleryDrawings]);
    } else {
      const drawings = await userState.fetchUserGalleryDrawings(userId);
      setWallDrawings(drawings);
    }
    setWallLoading(false);
  }, [isOwnProfile]);

  useEffect(() => {
    const fromRoomPath = sessionStorage.getItem('profileFromRoom');
    setFromRoom(fromRoomPath);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        if (isOwnProfile) {
          await userState.fetchCurrentUser();
          await userState.fetchUserRooms();
          await userState.fetchActivityRooms();
          await userState.fetchFriends();
          await userState.fetchIncomingFriendRequestsCount();
          if (!cancelled) {
            setUsername(userState.user?.username || '');
            setEmail(userState.user?.email || '');
            setPublicProfile({
              id: userState.user.id,
              username: userState.user.username,
              avatar_url: userState.user.avatar_url,
              created_at: userState.user.created_at,
              bio: userState.user.bio || ''
            });
            setBio(userState.user.bio || '');
            setFriendshipStatus({ status: 'self' });
          }
        } else {
          const data = await userState.fetchPublicUser(routeUserId);
          if (cancelled) return;
          setPublicProfile(data.user);
          setBio(data.user.bio || '');
          setFriendshipStatus(data.friendshipStatus || { status: 'none' });
        }
        await loadWall(routeUserId);
      } catch (err) {
        if (!cancelled) {
          navigate('/404', { replace: true });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    if (routeUserId) {
      loadProfile();
    }

    return () => { cancelled = true; };
  }, [routeUserId, isOwnProfile, loadWall, navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Файл слишком большой (макс. 2 МБ)');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreviewUrl(event.target.result);
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
      setPublicProfile(prev => ({ ...prev, avatar_url: userState.user.avatar_url }));
    } catch (err) {
      setUploadError(err.message || 'Ошибка загрузки');
    }
  };

  const handleSaveProfile = async () => {
    setPasswordError('');
    try {
      const updates = {};
      if (username !== userState.user.username) updates.username = username;
      if (email !== userState.user.email) updates.email = email;
      const bioChanged = bio !== (userState.user.bio || '');

      if (Object.keys(updates).length === 0 && !newPassword.trim() && !bioChanged) {
        setPasswordError('Нет изменений');
        return;
      }

      if (Object.keys(updates).length > 0) {
        await userState.updateProfile(updates);
      }
      if (bioChanged) {
        const savedBio = await userState.updateBio(bio);
        setBio(savedBio);
        setPublicProfile(prev => ({ ...prev, bio: savedBio }));
      }
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
      setPublicProfile(prev => ({ ...prev, username: userState.user.username, bio: userState.user.bio || bio }));
    } catch (err) {
      setPasswordError(err.response?.data?.error || userState.error || 'Ошибка сохранения');
    }
  };

  const handleLogout = () => {
    userState.logout();
    const room = sessionStorage.getItem('profileFromRoom');
    sessionStorage.removeItem('profileFromRoom');
    navigate(room || '/');
  };

  const handleCreateRoom = () => {
    canvasState.setShowRoomInterface(true);
  };

  const handleLikeDrawing = async (drawing) => {
    if (!userState.isAuthenticated) {
      navigate('/login');
      return;
    }
    setLikingId(drawing.id);
    try {
      const result = await userState.likeGalleryDrawing(drawing.id);
      setWallDrawings(prev => prev.map(d =>
        d.id === drawing.id
          ? { ...d, likes_count: result.likesCount, user_liked: result.liked }
          : d
      ));
    } catch (_) {
      userState.showToast('Не удалось поставить лайк');
    } finally {
      setLikingId(null);
    }
  };

  const handleRemoveDrawing = async (drawingId) => {
    if (!window.confirm('Удалить рисунок со стены?')) return;
    try {
      await userState.removeGalleryDrawing(drawingId);
      setWallDrawings(prev => prev.filter(d => d.id !== drawingId));
      userState.showToast('Рисунок удалён');
    } catch (_) {
      userState.showToast('Не удалось удалить');
    }
  };

  const openMessages = (targetUser) => {
    if (!userState.isAuthenticated) {
      navigate('/login');
      return;
    }
    setMessageTargetUser(targetUser);
    setShowPersonalMessagesModal(true);
  };

  const backLabel = /^\/[a-zA-Z0-9]{9}$/.test(fromRoom) ? '← В комнату' : '← На главную';
  const backTo = fromRoom || '/';
  const displayDrawings = isOwnProfile ? userState.galleryDrawings : wallDrawings;

  useEffect(() => {
    if (!publicProfile || !routeUserId) return undefined;

    const count = displayDrawings.length;
    const username = publicProfile.username;
    setSeoData({
      title: `${username} — стена рисунков | Рисование.Онлайн`,
      description: count > 0
        ? `Публичная стена ${username}: ${count} ${count === 1 ? 'рисунок' : count < 5 ? 'рисунка' : 'рисунков'} в галерее. Смотрите работы, ставьте лайки и добавляйте автора в друзья на Рисование.Онлайн.`
        : `Профиль ${username} на Рисование.Онлайн. Публичная стена рисунков, галерея работ и творческое сообщество.`,
      keywords: `${username}, стена рисунков, профиль художника, галерея рисунков, рисование онлайн, ${username} рисунки`,
      canonical: `https://risovanie.online/user/${routeUserId}`,
      pageType: 'profile',
      profileName: username
    });

    return () => setSeoData(null);
  }, [publicProfile, routeUserId, displayDrawings.length, setSeoData]);

  if (profileLoading || !publicProfile) {
    return (
      <div className="profile-page">
        <SocialHeader title="Профиль" backLabel={backLabel} backTo={backTo} />
        <div className="profile-loading"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <SocialHeader
        title={isOwnProfile ? 'Кабинет' : publicProfile.username}
        backLabel={backLabel}
        backTo={backTo}
      />

      <div className="profile-container">
        <div className="profile-content">
          <div className="profile-left">
            <div className="profile-avatar">
              <img
                src={previewUrl || publicProfile.avatar_url || defaultAvatar}
                alt="аватар"
                className="avatar-image"
              />
            </div>

            {isOwnProfile && (
              <div className="avatar-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <button className="profile-btn profile-btn-primary" onClick={() => fileInputRef.current.click()}>
                  Выбрать файл
                </button>
                {avatarFile && (
                  <button className="profile-btn profile-btn-primary" onClick={handleAvatarUpload}>
                    Сохранить
                  </button>
                )}
                {uploadError && <div className="profile-error">{uploadError}</div>}
              </div>
            )}

            {!isOwnProfile && (
              <div className="profile-other-actions">
                <FriendActions
                  userId={routeUserId}
                  friendshipStatus={friendshipStatus}
                  onStatusChange={(status) => setFriendshipStatus({ status })}
                />
                <button
                  type="button"
                  className="profile-btn profile-btn-secondary profile-message-link-btn"
                  onClick={() => openMessages(publicProfile)}
                >
                  💬 Написать сообщение
                </button>
              </div>
            )}
          </div>

          <div className="profile-right">
            {isOwnProfile && editMode ? (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Имя пользователя</label>
                  <input type="text" className="profile-input" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="profile-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>О себе</label>
                  <textarea
                    className="profile-input profile-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                    maxLength={BIO_MAX_LENGTH}
                    rows={4}
                    placeholder="Расскажите о себе (без ссылок и HTML)"
                  />
                  <div className="profile-bio-hint">{bio.length}/{BIO_MAX_LENGTH} · ссылки запрещены</div>
                </div>
                <div className="form-group">
                  <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="profile-input"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    />
                    <EyeIcon visible={showNewPassword} onClick={() => setShowNewPassword(!showNewPassword)} />
                  </div>
                </div>
                {newPassword.trim() && (
                  <div className="form-group">
                    <label>Текущий пароль</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="profile-input"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                      />
                      <EyeIcon visible={showCurrentPassword} onClick={() => setShowCurrentPassword(!showCurrentPassword)} />
                    </div>
                  </div>
                )}
                {passwordError && <div className="profile-error">{passwordError}</div>}
                <div className="form-actions">
                  <button className="profile-btn profile-btn-primary" onClick={handleSaveProfile}>Сохранить</button>
                  <button className="profile-btn profile-btn-secondary" onClick={() => { setEditMode(false); setPasswordError(''); setBio(publicProfile.bio || userState.user?.bio || ''); }}>Отмена</button>
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Имя:</span>
                  <span className="info-value">{publicProfile.username}</span>
                </div>
                {isOwnProfile && (
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{userState.user?.email}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Дата регистрации:</span>
                  <span className="info-value">
                    {publicProfile.created_at
                      ? new Date(Number(publicProfile.created_at)).toLocaleDateString()
                      : 'неизвестно'}
                  </span>
                </div>
                {isOwnProfile && (
                  <button className="profile-btn profile-btn-primary" onClick={() => setEditMode(true)}>
                    Редактировать профиль
                  </button>
                )}
              </div>
            )}

            <div className="profile-bio-section">
              <h3>О себе</h3>
              {(publicProfile.bio || bio) ? (
                <p className="profile-bio-text">{publicProfile.bio || bio}</p>
              ) : (
                <p className="profile-bio-empty">
                  {isOwnProfile ? 'Добавьте описание в режиме редактирования профиля' : 'Пользователь пока ничего не написал о себе'}
                </p>
              )}
            </div>

            {isOwnProfile && (
              <>
                <hr className="profile-divider" />
                <div className="profile-actions">
                  <button type="button" className="profile-action-btn" onClick={handleCreateRoom}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>Создать комнату</span>
                  </button>
                  <button
                    type="button"
                    className={`profile-action-btn ${userState.unreadMessagesCount > 0 ? 'notification' : ''}`}
                    onClick={() => openMessages(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Личные сообщения</span>
                    {userState.unreadMessagesCount > 0 && (
                      <span className="message-badge">{userState.unreadMessagesCount}</span>
                    )}
                  </button>
                </div>

                <div className="profile-section">
                  <h2>Мои друзья</h2>
                  {userState.friendsPreview.length === 0 ? (
                    <p className="profile-empty">
                      У вас пока нет друзей.{' '}
          <button type="button" className="profile-friends-preview__link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/friends?tab=find')}>
                        Найти друзей
                      </button>
                    </p>
                  ) : (
                    <div className="profile-friends-preview">
                      {userState.friendsPreview.map(friend => (
                        <img
                          key={friend.id}
                          src={friend.avatar_url || defaultAvatar}
                          alt={friend.username}
                          className="profile-friends-preview__avatar"
                          title={friend.username}
                          onClick={() => navigate(`/user/${friend.id}`)}
                        />
                      ))}
                      <button type="button" className="profile-friends-preview__link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/friends')}>
                        Все друзья →
                      </button>
                    </div>
                  )}
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
                            <span className={`room-badge ${room.isPublic ? 'room-badge-public' : 'room-badge-private'}`}>
                              {room.isPublic ? 'публичная' : 'приватная'}
                            </span>
                            <RoomActionsDropdown
                              room={room}
                              isCreator
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
                          <span className={`room-badge ${room.isPublic ? 'room-badge-public' : 'room-badge-private'}`}>
                            {room.isPublic ? 'публичная' : 'приватная'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <div className="profile-section">
              <h2>{isOwnProfile ? 'Моя стена' : 'Стена'}</h2>
              {wallLoading ? (
                <div className="profile-loading"><div className="spinner" /></div>
              ) : displayDrawings.length === 0 ? (
                <p className="profile-empty">
                  {isOwnProfile ? 'У вас пока нет рисунков в галерее' : 'Пока нет публикаций'}
                </p>
              ) : (
                <div className="profile-gallery-list">
                  {displayDrawings.map(drawing => (
                    <div key={drawing.id} className="profile-gallery-card">
                      <button
                        type="button"
                        className="profile-gallery-card__img-wrap"
                        style={{ border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
                        onClick={() => navigate(`/gallery/${drawing.id}`)}
                      >
                        {!imageErrors[drawing.id] && (
                          <img
                            src={`${API_URL}/api/gallery/image/${drawing.id}`}
                            alt={drawing.title}
                            className="profile-gallery-card__img"
                            onError={() => handleImageError(drawing.id)}
                          />
                        )}
                      </button>
                      <div className="profile-gallery-card__info">
                        <div className="profile-gallery-card__title">{drawing.title}</div>
                        <div className="profile-wall-card__actions">
                          <button
                            type="button"
                            className={`profile-wall-like-btn ${drawing.user_liked ? 'liked' : ''}`}
                            disabled={likingId === drawing.id}
                            onClick={() => handleLikeDrawing(drawing)}
                          >
                            <HeartIcon filled={drawing.user_liked} />
                            {drawing.likes_count}
                          </button>
                          {isOwnProfile && (
                            <button
                              type="button"
                              className="profile-wall-remove-btn"
                              onClick={() => handleRemoveDrawing(drawing.id)}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isOwnProfile && (
              <div className="profile-logout">
                <button className="profile-btn profile-btn-secondary" onClick={handleLogout}>
                  Выйти из профиля
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PersonalMessagesModal
        isOpen={showPersonalMessagesModal}
        onClose={() => { setShowPersonalMessagesModal(false); setMessageTargetUser(null); }}
        initialUser={messageTargetUser}
      />
    </div>
  );
});

export default ProfilePage;
