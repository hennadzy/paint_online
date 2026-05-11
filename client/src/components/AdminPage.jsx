import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import adminState from '../store/adminState';
import userState from '../store/userState';
import capabilitiesState from '../store/capabilitiesState';
import '../styles/admin.scss';

const getAdminApiBase = () => (window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://paint-online-back.onrender.com');
const adminGalleryImageCache = new Map();

/** Admin gallery images require Authorization; a plain img URL cannot send the Bearer token. */
function AdminGalleryImage({ drawingId, alt, className, wrapperStyle, imgStyle, onImageClick }) {
  const [src, setSrc] = useState(() => adminGalleryImageCache.get(String(drawingId)) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = String(drawingId);
    const cachedSrc = adminGalleryImageCache.get(cacheKey);
    if (cachedSrc) {
      setSrc(cachedSrc);
      setFailed(false);
      return () => {};
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setFailed(true);
      return () => {};
    }
    const API_BASE = getAdminApiBase();
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/admin/gallery/image/${drawingId}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        });
        if (cancelled) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (cancelled) return;
          const dataUrl = typeof reader.result === 'string' ? reader.result : null;
          if (dataUrl) {
            adminGalleryImageCache.set(cacheKey, dataUrl);
            setSrc(dataUrl);
            setFailed(false);
          } else {
            setFailed(true);
          }
        };
        reader.onerror = () => {
          if (!cancelled) setFailed(true);
        };
        reader.readAsDataURL(res.data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drawingId]);

  const wrapStyle = {
    minHeight: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: 11,
    ...wrapperStyle,
  };
  if (failed) {
    return <div className={className} style={wrapStyle}>Не удалось загрузить</div>;
  }
  if (!src) {
    return <div className={className} style={wrapStyle}>…</div>;
  }
  return <img src={src} alt={alt} className={className} style={imgStyle} onClick={onImageClick} />;
}

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/>
    <rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const RoomsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const BlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"/>
    <path d="m4.9 4.9 14.2 14.2"/>
  </svg>
);

const UnlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SortIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M12 5v14M5 12l7-7 7 7"/>
  </svg>
);

const AdminPage = observer(() => {
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');
  
  const [usersSortBy, setUsersSortBy] = useState('created_at');
  const [usersSortOrder, setUsersSortOrder] = useState('DESC');
  const [roomsSortBy, setRoomsSortBy] = useState('last_activity');
  const [roomsSortOrder, setRoomsSortOrder] = useState('DESC');
  
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    isActive: true
  });
  const [userFormError, setUserFormError] = useState('');

  const [usersFilterRole, setUsersFilterRole] = useState('all');
  const [usersFilterStatus, setUsersFilterStatus] = useState('all');

  const [roomsFilterType, setRoomsFilterType] = useState('all');
  const [roomsFilterPassword, setRoomsFilterPassword] = useState('all');

  const [roomFormData, setRoomFormData] = useState({ name: '' });
  const [roomFormError, setRoomFormError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [passwordFormError, setPasswordFormError] = useState('');

  const [coloringUploadTitle, setColoringUploadTitle] = useState('');
  const [coloringUploadAlt, setColoringUploadAlt] = useState('');
  const [coloringUploadFile, setColoringUploadFile] = useState(null);
  const [coloringUploadError, setColoringUploadError] = useState('');
  const [coloringUploadLoading, setColoringUploadLoading] = useState(false);
  const [coloringUploadSuccess, setColoringUploadSuccess] = useState('');

  const [galleryPreviewId, setGalleryPreviewId] = useState(null);
  const [galleryRenameId, setGalleryRenameId] = useState(null);
  const [galleryRenameTitle, setGalleryRenameTitle] = useState('');
  const [galleryRenameError, setGalleryRenameError] = useState('');

  const [galleryAltId, setGalleryAltId] = useState(null);
  const [galleryAltValue, setGalleryAltValue] = useState('');
  const [galleryAltError, setGalleryAltError] = useState('');

  const [galleryAuthorId, setGalleryAuthorId] = useState(null);
  const [galleryAuthorValue, setGalleryAuthorValue] = useState('');
  const [galleryAuthorError, setGalleryAuthorError] = useState('');

  const [galleryRejectId, setGalleryRejectId] = useState(null);
  const [galleryRejectReason, setGalleryRejectReason] = useState('');
  const [galleryActionError, setGalleryActionError] = useState('');

  const [broadcastScope, setBroadcastScope] = useState('all');
  const [broadcastChannels, setBroadcastChannels] = useState({ email: false, dm: true });
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastOnlyActive, setBroadcastOnlyActive] = useState(true);
  const [broadcastTargetIds, setBroadcastTargetIds] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcastError, setBroadcastError] = useState('');

  const [capEdit, setCapEdit] = useState(null);
  const [capSaveFeedback, setCapSaveFeedback] = useState(null);

  useEffect(() => {
    const cfg = adminState.roleCapabilitiesPayload?.config;
    if (cfg) {
      setCapEdit(JSON.parse(JSON.stringify(cfg)));
    }
  }, [adminState.roleCapabilitiesPayload]);

  useEffect(() => {
    if (adminState.selectedUser) {
      const user = adminState.selectedUser;
      setUserFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        isActive: user.is_active !== false
      });
      setUserFormError('');
    }
  }, [adminState.selectedUser]);

  useEffect(() => {
    if (adminState.selectedRoom) {
      const room = adminState.selectedRoom;
      setRoomFormData({ name: room.name || '' });
      setRoomFormError('');
    }
  }, [adminState.selectedRoom]);

  useEffect(() => {
    if (adminState.selectedUser) {
      setNewPassword('');
      setPasswordFormError('');
    }
  }, [adminState.selectedUser]);

  useEffect(() => {
    if (!userState.user || !['admin', 'superadmin'].includes(userState.user.role)) {
      navigate('/login');
      return;
    }
    adminState.fetchStats();
  }, [navigate]);

  const handleLogout = async () => {
    await userState.logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    adminState.setSearchQuery(localSearch);
    if (adminState.activeTab === 'users') {
      adminState.fetchUsers(1);
    } else if (adminState.activeTab === 'rooms') {
      adminState.fetchRooms(1);
    }
  };

  const handleUsersSort = (field) => {
    const newOrder = usersSortBy === field && usersSortOrder === 'DESC' ? 'ASC' : 'DESC';
    setUsersSortBy(field);
    setUsersSortOrder(newOrder);
    adminState.setSort(field, newOrder, 'users');
    adminState.fetchUsers(1);
  };

  const handleRoomsSort = (field) => {
    const newOrder = roomsSortBy === field && roomsSortOrder === 'DESC' ? 'ASC' : 'DESC';
    setRoomsSortBy(field);
    setRoomsSortOrder(newOrder);
    adminState.setSort(field, newOrder, 'rooms');
    adminState.fetchRooms(1);
  };

  const handleUsersFilter = () => {
    adminState.setFilters({
      role: usersFilterRole !== 'all' ? usersFilterRole : undefined,
      isActive: usersFilterStatus !== 'all' ? usersFilterStatus === 'active' : undefined
    });
    adminState.fetchUsers(1);
  };

  const handleRoomsFilter = () => {
    adminState.setFilters({
      isPublic: roomsFilterType !== 'all' ? roomsFilterType === 'public' : undefined,
      hasPassword: roomsFilterPassword !== 'all' ? roomsFilterPassword === 'yes' : undefined
    });
    adminState.fetchRooms(1);
  };

  const clearUsersFilters = () => {
    setUsersFilterRole('all');
    setUsersFilterStatus('all');
    adminState.setFilters({});
    adminState.fetchUsers(1);
  };

  const clearRoomsFilters = () => {
    setRoomsFilterType('all');
    setRoomsFilterPassword('all');
    adminState.setFilters({});
    adminState.fetchRooms(1);
  };

  const renderSortIcon = (field, currentSortBy, currentSortOrder) => {
    if (currentSortBy !== field) return null;
    return <span style={{ marginLeft: '4px' }}>{currentSortOrder === 'ASC' ? '↑' : '↓'}</span>;
  };

  const normalizeTimestampMs = (value) => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
      const ms = value.getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    if (typeof value === 'string') {
      const s = value.trim();
      if (s.length === 0) return null;
      if (/^\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n) || n <= 0) return null;
        return n < 1e12 ? n * 1000 : n;
      }
      const parsed = Date.parse(s);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n < 1e12 ? n * 1000 : n;
  };

  const formatDate = (timestamp) => {
    const ts = normalizeTimestampMs(timestamp);
    if (!ts) return '-';
    const d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '-';
    return d.toLocaleString('ru-RU');
  };

  const formatRelativeTime = (timestamp) => {
    const ts = normalizeTimestampMs(timestamp);
    if (!ts) return '-';
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} дн. назад`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} ч. назад`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins} мин. назад`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderDashboard = () => {
    if (!adminState.stats) {
      return (
        <div className="admin-loading">
          <div className="admin-loading__spinner"></div>
        </div>
      );
    }

    const { users, rooms, strokes } = adminState.stats;

    return (
      <div>
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Всего пользователей</div>
            <div className="admin-stat-card__value">{users.total}</div>
            <div className="admin-stat-card__sub">{users.active} активных</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Новых за 7 дней</div>
            <div className="admin-stat-card__value">{users.new7d}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Всего комнат</div>
            <div className="admin-stat-card__value">{rooms.total}</div>
            <div className="admin-stat-card__sub">{rooms.public} публичных, {rooms.private} приватных</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Активных за 7 дней</div>
            <div className="admin-stat-card__value">{rooms.active7d}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Всего штрихов</div>
            <div className="admin-stat-card__value">{strokes.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="admin-table-container">
          <div className="admin-toolbar">
            <h3>Последние регистрации</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Имя пользователя</th>
                <th>Email</th>
                <th>Дата регистрации</th>
              </tr>
            </thead>
            <tbody>
              {adminState.stats.recentRegistrations.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{formatDate(user.created_at)}</td>
                </tr>
              ))}
              {adminState.stats.recentRegistrations.length === 0 && (
                <tr>
                  <td colSpan="3" style={{textAlign: 'center', color: '#666'}}>
                    Нет пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div>
        <div className="admin-table-container">
          <div className="admin-toolbar">
            <div className="admin-filters">
              <div className="admin-filter-group">
                <select
                  className="admin-filter-select"
                  value={usersFilterRole}
                  onChange={(e) => {
                    setUsersFilterRole(e.target.value);
                    adminState.setFilters({
                      role: e.target.value !== 'all' ? e.target.value : undefined,
                      isActive: usersFilterStatus !== 'all' ? usersFilterStatus === 'active' : undefined
                    });
                    adminState.fetchUsers(1);
                  }}
                >
                  <option value="all">Все роли</option>
                  <option value="user">Пользователь</option>
                  <option value="premium">Премиум</option>
                  <option value="admin">Админ</option>
                  <option value="superadmin">Супер Админ</option>
                </select>
              </div>
              <div className="admin-filter-group">
                <select 
                  className="admin-filter-select"
                  value={usersFilterStatus}
                  onChange={(e) => {
                    setUsersFilterStatus(e.target.value);
                    adminState.setFilters({
                      role: usersFilterRole !== 'all' ? usersFilterRole : undefined,
                      isActive: e.target.value !== 'all' ? e.target.value === 'active' : undefined
                    });
                    adminState.fetchUsers(1);
                  }}
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Заблокированные</option>
                </select>
              </div>
            </div>
            <form className="admin-toolbar__search" onSubmit={handleSearch}>
              <div className="admin-search">
                <input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="admin-btn admin-btn--secondary">
                <SearchIcon /> Поиск
              </button>
            </form>
            <div className="admin-toolbar__actions">
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => adminState.exportUsers('csv')}
              >
                <DownloadIcon /> CSV
              </button>
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => adminState.exportUsers('json')}
              >
                <DownloadIcon /> JSON
              </button>
            </div>
          </div>

          {adminState.usersLoading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner"></div>
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-sortable" onClick={() => handleUsersSort('username')}>
                      Имя {renderSortIcon('username', usersSortBy, usersSortOrder)}
                    </th>
                    <th>UUID</th>
                    <th className="admin-sortable" onClick={() => handleUsersSort('email')}>
                      Email {renderSortIcon('email', usersSortBy, usersSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleUsersSort('role')}>
                      Роль {renderSortIcon('role', usersSortBy, usersSortOrder)}
                    </th>
                    <th>Статус</th>
                    <th className="admin-sortable" onClick={() => handleUsersSort('created_at')}>
                      Дата регистрации {renderSortIcon('created_at', usersSortBy, usersSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleUsersSort('last_login')}>
                      Последний вход {renderSortIcon('last_login', usersSortBy, usersSortOrder)}
                    </th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {adminState.users.map(user => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: 320 }}>
                          <code
                            style={{
                              fontSize: 12,
                              lineHeight: 1.35,
                              wordBreak: 'break-all',
                              color: '#b8c5d6',
                              flex: 1,
                              minWidth: 0
                            }}
                            title={user.id}
                          >
                            {user.id}
                          </code>
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{ flexShrink: 0, padding: '4px 8px', fontSize: 11 }}
                            title="Копировать UUID"
                            onClick={() => {
                              if (user.id && navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(user.id).catch(() => {});
                              }
                            }}
                          >
                            Копир.
                          </button>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${user.role}`}>
                          {user.role === 'superadmin' ? 'Super Admin' : 
                           user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>{formatRelativeTime(user.last_login)}</td>
                      <td>
                        <div className="admin-actions">
                          <button 
                            className="admin-icon-btn"
                            onClick={() => adminState.fetchUserDetails(user.id).then(() => adminState.openUserModal(user))}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            className="admin-icon-btn"
                            onClick={() => adminState.openPasswordModal(user)}
                            title="Сменить пароль"
                          >
                            <KeyIcon />
                          </button>
                          <button 
                            className="admin-icon-btn"
                            onClick={() => adminState.toggleUserActive(user.id)}
                            title={user.is_active ? 'Заблокировать' : 'Разблокировать'}
                          >
                            {user.is_active ? <BlockIcon /> : <UnlockIcon />}
                          </button>
                          <button 
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => adminState.openDeleteConfirm({ type: 'user', id: user.id, name: user.username })}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminState.users.length === 0 && (
                    <tr>
                      <td colSpan="8" className="admin-empty">
                        <div className="admin-empty__text">Пользователи не найдены</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {adminState.usersPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="admin-pagination__btn"
                    disabled={adminState.usersPagination.page === 1}
                    onClick={() => adminState.changePage('users', adminState.usersPagination.page - 1)}
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(5, adminState.usersPagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        className={`admin-pagination__btn ${adminState.usersPagination.page === page ? 'active' : ''}`}
                        onClick={() => adminState.changePage('users', page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <span className="admin-pagination__info">
                    Стр. {adminState.usersPagination.page} из {adminState.usersPagination.totalPages}
                  </span>
                  <button
                    className="admin-pagination__btn"
                    disabled={adminState.usersPagination.page === adminState.usersPagination.totalPages}
                    onClick={() => adminState.changePage('users', adminState.usersPagination.page + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRooms = () => {
    return (
      <div>
        <div className="admin-table-container">
          <div className="admin-toolbar">
            <form className="admin-toolbar__search" onSubmit={handleSearch}>
              <div className="admin-search">
                <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="admin-btn admin-btn--secondary">
                <SearchIcon /> Поиск
              </button>
            </form>
            <div className="admin-toolbar__actions">
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => adminState.exportRooms('csv')}
              >
                <DownloadIcon /> CSV
              </button>
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => adminState.exportRooms('json')}
              >
                <DownloadIcon /> JSON
              </button>
            </div>
          </div>

          {adminState.roomsLoading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner"></div>
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('name')}>
                      Название {renderSortIcon('name', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('is_public')}>
                      Тип {renderSortIcon('is_public', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('stroke_count')}>
                      Штрихов {renderSortIcon('stroke_count', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('unique_users')}>
                      Пользователей {renderSortIcon('unique_users', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('weight')}>
                      Размер {renderSortIcon('weight', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('created_at')}>
                      Создана {renderSortIcon('created_at', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th className="admin-sortable" onClick={() => handleRoomsSort('last_activity')}>
                      Активность {renderSortIcon('last_activity', roomsSortBy, roomsSortOrder)}
                    </th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {adminState.rooms.map(room => (
                    <tr key={room.id}>
                      <td>{room.name}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${room.isPublic ? 'public' : 'private'}`}>
                          {room.isPublic ? 'Публичная' : 'Приватная'}
                          {room.hasPassword && ' 🔒'}
                        </span>
                      </td>
                      <td>{room.strokeCount}</td>
                      <td>{room.uniqueUsers}</td>
                      <td>{formatBytes(room.weight)}</td>
                      <td>{formatDate(room.createdAt)}</td>
                      <td>{formatRelativeTime(room.lastActivity)}</td>
                      <td>
                        <div className="admin-actions">
                          <button 
                            className="admin-icon-btn"
                            onClick={() => adminState.fetchRoomDetails(room.id).then(() => adminState.openRoomModal(room))}
                            title="Подробнее"
                          >
                            <EyeIcon />
                          </button>
                          <button 
                            className="admin-icon-btn"
                            onClick={() => adminState.fetchRoomDetails(room.id).then(() => adminState.openRoomModal(room))}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            className="admin-icon-btn"
                            onClick={async () => {
                              const result = await adminState.joinRoom(room.id);
                              if (result.success) {
                                localStorage.setItem(`room_token_${room.id}`, result.data.token);
                                navigate(`/${room.id}`);
                              }
                            }}
                            title="Войти в комнату"
                          >
                            <UnlockIcon />
                          </button>
                          <button 
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => adminState.openDeleteConfirm({ type: 'room', id: room.id, name: room.name })}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminState.rooms.length === 0 && (
                    <tr>
                      <td colSpan="7" className="admin-empty">
                        <div className="admin-empty__text">Комнаты не найдены</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {adminState.roomsPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="admin-pagination__btn"
                    disabled={adminState.roomsPagination.page === 1}
                    onClick={() => adminState.changePage('rooms', adminState.roomsPagination.page - 1)}
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(5, adminState.roomsPagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        className={`admin-pagination__btn ${adminState.roomsPagination.page === page ? 'active' : ''}`}
                        onClick={() => adminState.changePage('rooms', page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <span className="admin-pagination__info">
                    Стр. {adminState.roomsPagination.page} из {adminState.roomsPagination.totalPages}
                  </span>
                  <button
                    className="admin-pagination__btn"
                    disabled={adminState.roomsPagination.page === adminState.roomsPagination.totalPages}
                    onClick={() => adminState.changePage('rooms', adminState.roomsPagination.page + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderUserModal = () => {
    if (!adminState.showUserModal) return null;

    const user = adminState.selectedUser || {};

    const handleSubmit = async (e) => {
      e.preventDefault();
      setUserFormError('');
      
      const result = await adminState.updateUser(user.id, userFormData);
      if (!result.success) {
        setUserFormError(result.error);
      }
    };

    return (
      <div className="admin-modal-overlay" onClick={() => adminState.closeUserModal()}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal__header">
            <h2>Редактирование пользователя</h2>
            <button className="admin-modal__close" onClick={() => adminState.closeUserModal()}>
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="admin-modal__body">
              {userFormError && <div className="admin-form__error" style={{marginBottom: '15px'}}>{userFormError}</div>}
              
              <div className="admin-form__group">
                <label>Имя пользователя</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="admin-form__group">
                <label>Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="admin-form__group">
                <label>Роль</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                >
                  <option value="user">Пользователь</option>
                  <option value="premium">Премиум</option>
                  <option value="admin">Админ</option>
                  <option value="superadmin">Супер Админ</option>
                </select>
              </div>
              
              <div className="admin-form__group">
                <label>
                  <input
                    type="checkbox"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({...userFormData, isActive: e.target.checked})}
                    style={{marginRight: '8px'}}
                  />
                  Активен
                </label>
              </div>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => adminState.closeUserModal()}>
                Отмена
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderRoomModal = () => {
    if (!adminState.showRoomModal) return null;

    const room = adminState.selectedRoom || {};

    const handleSubmit = async (e) => {
      e.preventDefault();
      setRoomFormError('');
      
      const result = await adminState.updateRoom(room.id, roomFormData);
      if (!result.success) {
        setRoomFormError(result.error);
      }
    };

    return (
      <div className="admin-modal-overlay" onClick={() => adminState.closeRoomModal()}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal__header">
            <h2>Информация о комнате</h2>
            <button className="admin-modal__close" onClick={() => adminState.closeRoomModal()}>
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="admin-modal__body">
              {roomFormError && <div className="admin-form__error" style={{marginBottom: '15px'}}>{roomFormError}</div>}
              
              <div className="admin-room-details__info">
                <div className="admin-room-details__item">
                  <label>ID</label>
                  <span>{room.id}</span>
                </div>
                <div className="admin-room-details__item">
                  <label>Тип</label>
                  <span>
                    <span className={`admin-badge admin-badge--${room.isPublic ? 'public' : 'private'}`}>
                      {room.isPublic ? 'Публичная' : 'Приватная'}
                    </span>
                  </span>
                </div>
                <div className="admin-room-details__item">
                  <label>Защищена паролем</label>
                  <span>{room.hasPassword ? 'Да 🔒' : 'Нет'}</span>
                </div>
                <div className="admin-room-details__item">
                  <label>Количество штрихов</label>
                  <span>{room.strokeCount || 0}</span>
                </div>
                <div className="admin-room-details__item">
                  <label>Уникальных пользователей</label>
                  <span>{room.uniqueUsers || 0}</span>
                </div>
                <div className="admin-room-details__item">
                  <label>Размер холста</label>
                  <span>{(room.canvasWidth || 0)} x {(room.canvasHeight || 0)}</span>
                </div>
                <div className="admin-room-details__item admin-room-details__full">
                  <label>Создана</label>
                  <span>{formatDate(room.createdAt)}</span>
                </div>
                <div className="admin-room-details__item admin-room-details__full">
                  <label>Последняя активность</label>
                  <span>{formatDate(room.lastActivity)}</span>
                </div>
              </div>
              
              <div className="admin-form__group">
                <label>Название</label>
                <input
                  type="text"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({...roomFormData, name: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="admin-modal__footer">
              <button 
                type="button" 
                className="admin-btn admin-btn--success"
                onClick={async () => {
                  const result = await adminState.joinRoom(room.id);
                  if (result.success) {
                    localStorage.setItem(`room_token_${room.id}`, result.data.token);
                    navigate(`/${room.id}`);
                  }
                }}
                style={{marginRight: 'auto'}}
              >
                Войти в комнату
              </button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => adminState.closeRoomModal()}>
                Закрыть
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPasswordModal = () => {
    if (!adminState.showPasswordModal) return null;

    const user = adminState.selectedUser || {};

    const handleSubmit = async (e) => {
      e.preventDefault();
      setPasswordFormError('');
      
      if (newPassword.length < 6) {
        setPasswordFormError('Пароль должен быть не менее 6 символов');
        return;
      }
      
      const result = await adminState.changeUserPassword(user.id, newPassword);
      if (!result.success) {
        setPasswordFormError(result.error);
      } else {
        alert('Пароль изменён');
      }
    };

    return (
      <div className="admin-modal-overlay" onClick={() => adminState.closePasswordModal()}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal__header">
            <h2>Смена пароля: {user.username}</h2>
            <button className="admin-modal__close" onClick={() => adminState.closePasswordModal()}>
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="admin-modal__body">
              {passwordFormError && <div className="admin-form__error" style={{marginBottom: '15px'}}>{passwordFormError}</div>}
              
              <div className="admin-form__group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => adminState.closePasswordModal()}>
                Отмена
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">
                Изменить пароль
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteConfirm = () => {
    if (!adminState.showDeleteConfirm) return null;

    const target = adminState.deleteTarget || {};

    const handleConfirm = async () => {
      if (target.type === 'user') {
        await adminState.deleteUser(target.id);
      } else if (target.type === 'room') {
        await adminState.deleteRoom(target.id);
      }
    };

    return (
      <div className="admin-modal-overlay" onClick={() => adminState.closeDeleteConfirm()}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal__body">
            <div className="admin-confirm">
              <div className="admin-confirm__icon">
                <DeleteIcon />
              </div>
              <h3 className="admin-confirm__title">Подтверждение удаления</h3>
              <p className="admin-confirm__message">
                Вы уверены, что хотите удалить {target.type === 'user' ? 'пользователя' : 'комнату'} "{target.name}"?
                <br />
                Это действие нельзя отменить.
              </p>
              <div className="admin-confirm__actions">
                <button 
                  className="admin-btn admin-btn--secondary"
                  onClick={() => adminState.closeDeleteConfirm()}
                >
                  Отмена
                </button>
                <button 
                  className="admin-btn admin-btn--danger"
                  onClick={handleConfirm}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGameModes = () => {
  const handleColoringUpload = async (e) => {
    e.preventDefault();
    setColoringUploadError('');
    setColoringUploadSuccess('');

    if (!coloringUploadTitle.trim()) {
      setColoringUploadError('Введите название раскраски');
      return;
    }
    if (!coloringUploadFile) {
      setColoringUploadError('Выберите изображение');
      return;
    }

    setColoringUploadLoading(true);
    const formData = new FormData();
    formData.append('title', coloringUploadTitle.trim());
    formData.append('alt', (coloringUploadAlt || coloringUploadTitle).trim().substring(0, 200));
    formData.append('image', coloringUploadFile);

    const result = await adminState.uploadColoringPage(formData);
    setColoringUploadLoading(false);

    if (result.success) {
      setColoringUploadTitle('');
      setColoringUploadAlt('');
      setColoringUploadFile(null);
      setColoringUploadSuccess('Раскраска успешно добавлена!');
      setTimeout(() => setColoringUploadSuccess(''), 3000);
    } else {
      setColoringUploadError(result.error);
    }
  };

    const handleToggleActive = async (page) => {
      await adminState.updateColoringPage(page.id, { isActive: !page.is_active });
    };

    const handleDelete = async (page) => {
      if (!window.confirm(`Удалить раскраску "${page.title}"?`)) return;
      await adminState.deleteColoringPage(page.id);
    };

    return (
      <div>
        {/* Upload Form */}
        <div className="admin-table-container" style={{ marginBottom: '24px' }}>
          <div className="admin-toolbar">
            <h3 style={{ color: '#ffd700', margin: 0 }}>🎨 Раскраски — добавить новую</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <form onSubmit={handleColoringUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              {coloringUploadError && (
                <div className="admin-form__error">{coloringUploadError}</div>
              )}
              {coloringUploadSuccess && (
                <div style={{ color: '#28a745', fontSize: '14px', padding: '8px 12px', background: 'rgba(40,167,69,0.1)', borderRadius: '6px', border: '1px solid rgba(40,167,69,0.3)' }}>
                  {coloringUploadSuccess}
                </div>
              )}
              <div className="admin-form__group" style={{ marginBottom: 0 }}>
                <label>Название раскраски</label>
                <input
                  type="text"
                  value={coloringUploadTitle}
                  onChange={(e) => setColoringUploadTitle(e.target.value)}
                  placeholder="Например: Котик, Замок, Цветы..."
                  maxLength={100}
                />
              </div>

              <div className="admin-form__group" style={{ marginBottom: 0 }}>
                <label>ALT для изображения</label>
                <input
                  type="text"
                  value={coloringUploadAlt}
                  onChange={(e) => setColoringUploadAlt(e.target.value)}
                  placeholder="Например: Котик для раскрашивания"
                  maxLength={200}
                />
              </div>

              <div className="admin-form__group" style={{ marginBottom: 0 }}>
                <label>Изображение (PNG, JPG, WebP — до 15 МБ)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={(e) => setColoringUploadFile(e.target.files[0] || null)}
                  style={{ color: '#e0e0e0', padding: '8px 0' }}
                />
                {coloringUploadFile && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Выбрано: {coloringUploadFile.name} ({(coloringUploadFile.size / 1024).toFixed(0)} КБ)
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={coloringUploadLoading}
                style={{ alignSelf: 'flex-start' }}
              >
                {coloringUploadLoading ? 'Загрузка...' : '+ Добавить раскраску'}
              </button>
            </form>
          </div>
        </div>

        {/* Coloring Pages List */}
        <div className="admin-table-container">
          <div className="admin-toolbar">
            <h3 style={{ color: '#ffd700', margin: 0 }}>
              Список раскрасок ({adminState.coloringPages.length})
            </h3>
          </div>

          {adminState.coloringPagesLoading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner"></div>
            </div>
          ) : adminState.coloringPages.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty__text">Раскраски не добавлены</div>
            </div>
          ) : (
            <div className="admin-coloring-list">
              {adminState.coloringPages.map(page => (
                <div key={page.id} className="admin-coloring-item">
                  <div className="admin-coloring-item__preview">
                        <img
                      src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://paint-online-back.onrender.com'}${page.thumbnail_url || page.image_url}`}
                      alt={page.alt || page.title}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="admin-coloring-item__info">
                    <div className="admin-coloring-item__title">{page.title}</div>
                    <div className="admin-coloring-item__meta">
                      <span className={`admin-badge admin-badge--${page.is_active ? 'active' : 'inactive'}`}>
                        {page.is_active ? 'Активна' : 'Скрыта'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        ID: {page.id}
                      </span>
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button
                      className="admin-icon-btn"
                      onClick={() => handleToggleActive(page)}
                      title={page.is_active ? 'Скрыть' : 'Показать'}
                    >
                      {page.is_active ? <BlockIcon /> : <UnlockIcon />}
                    </button>
                    <button
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => handleDelete(page)}
                      title="Удалить"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGallery = () => {
    const handleOpenPreview = (e, drawingId) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      setGalleryPreviewId(String(drawingId));
    };

    const handleApprove = async (id) => {
      setGalleryActionError('');
      const result = await adminState.approveGalleryDrawing(id);
      if (!result.success) setGalleryActionError(result.error);
    };

    const handleSaveGalleryAlt = async (id) => {
      setGalleryAltError('');
      const altToSave = (galleryAltValue || '').trim();
      if (!altToSave) {
        setGalleryAltError('Введите alt');
        return;
      }
      const result = await adminState.updateGalleryAlt(id, altToSave);
      if (result.success) {
        setGalleryAltId(null);
        setGalleryAltValue('');
      } else {
        setGalleryAltError(result.error);
      }
    };

    const handleSaveGalleryAuthorName = async (id) => {
      setGalleryAuthorError('');
      const authorToSave = (galleryAuthorValue || '').trim();
      if (!authorToSave) {
        setGalleryAuthorError('Введите имя автора');
        return;
      }
      const result = await adminState.updateGalleryAuthorName(id, authorToSave);
      if (result.success) {
        setGalleryAuthorId(null);
        setGalleryAuthorValue('');
      } else {
        setGalleryAuthorError(result.error);
      }
    };

    const handleReject = async () => {
      if (!galleryRejectId) return;
      setGalleryActionError('');
      const result = await adminState.rejectGalleryDrawing(galleryRejectId, galleryRejectReason);
      if (result.success) {
        setGalleryRejectId(null);
        setGalleryRejectReason('');
      } else {
        setGalleryActionError(result.error);
      }
    };

    const handleRename = async (id) => {
      setGalleryRenameError('');
      if (!galleryRenameTitle.trim()) {
        setGalleryRenameError('Введите название');
        return;
      }
      const result = await adminState.renameGalleryDrawing(id, galleryRenameTitle.trim());
      if (result.success) {
        setGalleryRenameId(null);
        setGalleryRenameTitle('');
      } else {
        setGalleryRenameError(result.error);
      }
    };

    const handleDelete = async (id, title) => {
      if (!window.confirm(`Удалить рисунок «${title}»?`)) return;
      setGalleryActionError('');
      const result = await adminState.deleteGalleryDrawing(id);
      if (!result.success) setGalleryActionError(result.error);
    };

    return (
      <div>
        <div className="admin-table-container">
          <div className="admin-toolbar">
            <h3 style={{ color: '#ffd700', margin: 0 }}>
              🖼️ Рисунки на одобрение ({adminState.galleryPending.length})
            </h3>
            <button
              className="admin-btn admin-btn--secondary"
              onClick={() => adminState.fetchGalleryAll()}
              style={{ marginLeft: 'auto' }}
            >
              Обновить всё
            </button>
          </div>

          {galleryActionError && (
            <div className="admin-form__error" style={{ margin: '12px 20px' }}>
              {galleryActionError}
            </div>
          )}

          {adminState.galleryPendingLoading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner"></div>
            </div>
          ) : adminState.galleryPending.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty__text">Нет рисунков на рассмотрении</div>
            </div>
          ) : (
            <div className="admin-coloring-list">
              {adminState.galleryPending.map(drawing => (
                <div key={drawing.id} className="admin-coloring-item" style={{ alignItems: 'flex-start', gap: '16px' }}>
                  {/* Preview */}
                    <div
                      className="admin-coloring-item__preview admin-gallery-preview"
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                      data-drawing-id={drawing.id}
                      title="Нажмите для просмотра"
                      onClick={(e) => handleOpenPreview(e, drawing.id)}
                      onTouchEnd={(e) => handleOpenPreview(e, drawing.id)}
                      onPointerUp={(e) => handleOpenPreview(e, drawing.id)}
                    >
                      <AdminGalleryImage drawingId={drawing.id} alt={drawing.alt || drawing.title} />
                    <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                      👁 Просмотр
                    </div>
                  </div>

                  {/* Info */}
                  <div className="admin-coloring-item__info" style={{ flex: 1, minWidth: 0 }}>
                    {galleryRenameId === drawing.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={galleryRenameTitle}
                          onChange={(e) => { setGalleryRenameTitle(e.target.value); setGalleryRenameError(''); }}
                          maxLength={20}
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ffd700',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '14px',
                            outline: 'none',
                            width: '160px'
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(drawing.id);
                            if (e.key === 'Escape') { setGalleryRenameId(null); setGalleryRenameTitle(''); }
                          }}
                        />
                        <button className="admin-btn admin-btn--primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleRename(drawing.id)}>
                          ✓
                        </button>
                        <button className="admin-btn admin-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryRenameId(null); setGalleryRenameTitle(''); setGalleryRenameError(''); }}>
                          ✕
                        </button>
                        {galleryRenameError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryRenameError}</span>}
                      </div>
                    ) : (
                      <div className="admin-coloring-item__title">{drawing.title}</div>
                    )}
                    <div className="admin-coloring-item__meta" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#aaa' }}>✏️ {drawing.author_name}</span>
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                        {drawing.created_at ? new Date(Number(drawing.created_at)).toLocaleString('ru-RU') : ''}
                      </span>
                    </div>

                    {/* ALT input */}
                    {galleryAltId === drawing.id ? (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={galleryAltValue}
                          onChange={(e) => { setGalleryAltValue(e.target.value); setGalleryAltError(''); }}
                          placeholder="Введите alt"
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ffd700',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '13px',
                            outline: 'none',
                            width: '260px'
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveGalleryAlt(drawing.id);
                            if (e.key === 'Escape') { setGalleryAltId(null); setGalleryAltValue(''); setGalleryAltError(''); }
                          }}
                        />
                        <button className="admin-btn admin-btn--primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleSaveGalleryAlt(drawing.id)}>
                          ✓
                        </button>
                        <button className="admin-btn admin-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryAltId(null); setGalleryAltValue(''); setGalleryAltError(''); }}>
                          ✕
                        </button>
                        {galleryAltError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryAltError}</span>}
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Alt: {drawing.alt || drawing.title}</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => { setGalleryAltId(drawing.id); setGalleryAltValue(drawing.alt || drawing.title); setGalleryAltError(''); }}
                        >
                          Редактировать alt
                        </button>
                      </div>
                    )}

                    {/* Author signature input */}
                    {galleryAuthorId === drawing.id ? (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={galleryAuthorValue}
                          onChange={(e) => { setGalleryAuthorValue(e.target.value); setGalleryAuthorError(''); }}
                          placeholder="Имя автора"
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ffd700',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '13px',
                            outline: 'none',
                            width: '260px'
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveGalleryAuthorName(drawing.id);
                            if (e.key === 'Escape') { setGalleryAuthorId(null); setGalleryAuthorValue(''); setGalleryAuthorError(''); }
                          }}
                        />
                        <button className="admin-btn admin-btn--primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleSaveGalleryAuthorName(drawing.id)}>
                          ✓
                        </button>
                        <button className="admin-btn admin-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryAuthorId(null); setGalleryAuthorValue(''); setGalleryAuthorError(''); }}>
                          ✕
                        </button>
                        {galleryAuthorError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryAuthorError}</span>}
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Автор: {drawing.author_name || drawing.author_name}</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => { setGalleryAuthorId(drawing.id); setGalleryAuthorValue(drawing.author_name || ''); setGalleryAuthorError(''); }}
                        >
                          Редактировать автора
                        </button>
                      </div>
                    )}

                    {/* Reject reason input */}
                    {galleryRejectId === drawing.id && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={galleryRejectReason}
                          onChange={(e) => setGalleryRejectReason(e.target.value)}
                          placeholder="Причина отказа (необязательно)"
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ff6699',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '13px',
                            outline: 'none',
                            width: '220px'
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReject();
                            if (e.key === 'Escape') { setGalleryRejectId(null); setGalleryRejectReason(''); }
                          }}
                        />
                        <button className="admin-btn admin-btn--danger" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleReject}>
                          Отклонить
                        </button>
                        <button className="admin-btn admin-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryRejectId(null); setGalleryRejectReason(''); }}>
                          Отмена
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="admin-actions" style={{ flexShrink: 0 }}>
                    <button
                      className="admin-icon-btn admin-icon-btn--success"
                      onClick={() => handleApprove(drawing.id)}
                      title="Одобрить"
                      style={{ color: '#28a745' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    </button>
                    <button
                      className="admin-icon-btn"
                      onClick={() => {
                        setGalleryRenameId(drawing.id);
                        setGalleryRenameTitle(drawing.title);
                        setGalleryRenameError('');
                      }}
                      title="Переименовать"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => {
                        if (galleryRejectId === drawing.id) {
                          setGalleryRejectId(null);
                          setGalleryRejectReason('');
                        } else {
                          setGalleryRejectId(drawing.id);
                          setGalleryRejectReason('');
                        }
                      }}
                      title="Отклонить"
                      style={{ color: '#ff9500' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    </button>
                    <button
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => handleDelete(drawing.id, drawing.title)}
                      title="Удалить"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="admin-gallery-section-divider"
          style={{
            margin: '28px 0 24px',
            border: 'none',
            borderTop: '1px solid rgba(255, 215, 0, 0.25)',
            background: 'transparent',
          }}
          role="separator"
        />

        <div className="admin-table-container">
          <div className="admin-toolbar">
            <h3 style={{ color: '#ffd700', margin: 0 }}>
              🎨 В галерее ({adminState.galleryApproved.length})
            </h3>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => adminState.fetchGalleryApproved()}
              style={{ marginLeft: 'auto' }}
            >
              Обновить список
            </button>
          </div>

          {adminState.galleryApprovedError && (
            <div className="admin-form__error" style={{ margin: '12px 20px' }}>
              {adminState.galleryApprovedError}
            </div>
          )}

          {adminState.galleryApprovedLoading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner" />
            </div>
          ) : adminState.galleryApproved.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty__text">Нет опубликованных работ</div>
            </div>
          ) : (
            <div className="admin-coloring-list">
              {adminState.galleryApproved.map(drawing => (
                <div key={drawing.id} className="admin-coloring-item" style={{ alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    className="admin-coloring-item__preview admin-gallery-preview"
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                    data-drawing-id={drawing.id}
                    title="Нажмите для просмотра"
                    onClick={(e) => handleOpenPreview(e, drawing.id)}
                    onTouchEnd={(e) => handleOpenPreview(e, drawing.id)}
                    onPointerUp={(e) => handleOpenPreview(e, drawing.id)}
                  >
                    <AdminGalleryImage drawingId={drawing.id} alt={drawing.alt || drawing.title} />
                    <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                      👁 Просмотр
                    </div>
                  </div>

                  <div className="admin-coloring-item__info" style={{ flex: 1, minWidth: 0 }}>
                    {galleryRenameId === drawing.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={galleryRenameTitle}
                          onChange={(e) => { setGalleryRenameTitle(e.target.value); setGalleryRenameError(''); }}
                          maxLength={20}
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ffd700',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '14px',
                            outline: 'none',
                            width: '160px',
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(drawing.id);
                            if (e.key === 'Escape') { setGalleryRenameId(null); setGalleryRenameTitle(''); }
                          }}
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => handleRename(drawing.id)}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => { setGalleryRenameId(null); setGalleryRenameTitle(''); setGalleryRenameError(''); }}
                        >
                          ✕
                        </button>
                        {galleryRenameError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryRenameError}</span>}
                      </div>
                    ) : (
                      <div className="admin-coloring-item__title">{drawing.title}</div>
                    )}

                    <div className="admin-coloring-item__meta" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#aaa' }}>✏️ {drawing.author_name}</span>
                      <span style={{ fontSize: '12px', color: '#888', marginLeft: '10px' }}>
                        ❤️ {drawing.likes_count ?? 0}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px', display: 'block', marginTop: '4px' }}>
                        Опубликовано:{' '}
                        {drawing.approved_at ? new Date(Number(drawing.approved_at)).toLocaleString('ru-RU') : '—'}
                      </span>

                      {/* ALT editor (approved) */}
                      {galleryAltId === drawing.id ? (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={galleryAltValue}
                            onChange={(e) => { setGalleryAltValue(e.target.value); setGalleryAltError(''); }}
                            placeholder="Введите alt"
                            style={{
                              background: '#1a1a2e',
                              border: '1.5px solid #ffd700',
                              borderRadius: '6px',
                              color: '#fff',
                              padding: '6px 10px',
                              fontSize: '13px',
                              outline: 'none',
                              width: '260px'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveGalleryAlt(drawing.id);
                              if (e.key === 'Escape') { setGalleryAltId(null); setGalleryAltValue(''); setGalleryAltError(''); }
                            }}
                          />
                          <button
                            className="admin-btn admin-btn--primary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            type="button"
                            onClick={() => handleSaveGalleryAlt(drawing.id)}
                          >
                            ✓
                          </button>
                          <button
                            className="admin-btn admin-btn--secondary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            type="button"
                            onClick={() => { setGalleryAltId(null); setGalleryAltValue(''); setGalleryAltError(''); }}
                          >
                            ✕
                          </button>
                          {galleryAltError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryAltError}</span>}
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#666' }}>Alt: {drawing.alt || drawing.title}</span>
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => { setGalleryAltId(drawing.id); setGalleryAltValue(drawing.alt || drawing.title); setGalleryAltError(''); }}
                          >
                            Редактировать alt
                          </button>
                        </div>
                      )}

                      {/* Author name editor (approved) */}
                      {galleryAuthorId === drawing.id ? (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={galleryAuthorValue}
                            onChange={(e) => { setGalleryAuthorValue(e.target.value); setGalleryAuthorError(''); }}
                            placeholder="Имя автора"
                            style={{
                              background: '#1a1a2e',
                              border: '1.5px solid #ffd700',
                              borderRadius: '6px',
                              color: '#fff',
                              padding: '6px 10px',
                              fontSize: '13px',
                              outline: 'none',
                              width: '260px'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveGalleryAuthorName(drawing.id);
                              if (e.key === 'Escape') { setGalleryAuthorId(null); setGalleryAuthorValue(''); setGalleryAuthorError(''); }
                            }}
                          />
                          <button
                            className="admin-btn admin-btn--primary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            type="button"
                            onClick={() => handleSaveGalleryAuthorName(drawing.id)}
                          >
                            ✓
                          </button>
                          <button
                            className="admin-btn admin-btn--secondary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            type="button"
                            onClick={() => { setGalleryAuthorId(null); setGalleryAuthorValue(''); setGalleryAuthorError(''); }}
                          >
                            ✕
                          </button>
                          {galleryAuthorError && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>{galleryAuthorError}</span>}
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#666' }}>Автор: {drawing.author_name}</span>
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => { setGalleryAuthorId(drawing.id); setGalleryAuthorValue(drawing.author_name || ''); setGalleryAuthorError(''); }}
                          >
                            Редактировать автора
                          </button>
                        </div>
                      )}
                    </div>

                    {galleryRejectId === drawing.id && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={galleryRejectReason}
                          onChange={(e) => setGalleryRejectReason(e.target.value)}
                          placeholder="Причина снятия с публикации (необязательно)"
                          style={{
                            background: '#1a1a2e',
                            border: '1.5px solid #ff6699',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '6px 10px',
                            fontSize: '13px',
                            outline: 'none',
                            width: '220px',
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReject();
                            if (e.key === 'Escape') { setGalleryRejectId(null); setGalleryRejectReason(''); }
                          }}
                        />
                        <button type="button" className="admin-btn admin-btn--danger" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleReject}>
                          Снять с публикации
                        </button>
                        <button type="button" className="admin-btn admin-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryRejectId(null); setGalleryRejectReason(''); }}>
                          Отмена
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="admin-actions" style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => {
                        setGalleryRenameId(drawing.id);
                        setGalleryRenameTitle(drawing.title);
                        setGalleryRenameError('');
                      }}
                      title="Переименовать"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => {
                        if (galleryRejectId === drawing.id) {
                          setGalleryRejectId(null);
                          setGalleryRejectReason('');
                        } else {
                          setGalleryRejectId(drawing.id);
                          setGalleryRejectReason('');
                        }
                      }}
                      title="Снять с публикации"
                      style={{ color: '#ff9500' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => handleDelete(drawing.id, drawing.title)}
                      title="Удалить"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full-size preview modal */}
        {galleryPreviewId && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10001, cursor: 'pointer', padding: '20px',
              touchAction: 'none', overscrollBehavior: 'contain',
              '-webkit-overflow-scrolling': 'touch'
            }}
            onClick={(e) => {
              e.preventDefault();
              setGalleryPreviewId(null);
            }}
            onTouchStart={(e) => e.preventDefault()}
          >
            <AdminGalleryImage
              drawingId={galleryPreviewId}
              alt="preview"
              wrapperStyle={{ minHeight: 120 }}
              imgStyle={{
                maxWidth: '95vw',
                maxHeight: '90vh',
                borderRadius: '12px',
                boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
                pointerEvents: 'none'
              }}
              onImageClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
            <button
              style={{
                position: 'absolute', top: '16px', right: '20px',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px', color: '#fff', fontSize: '20px', padding: '8px 16px',
                cursor: 'pointer', backdropFilter: 'blur(10px)', touchAction: 'manipulation'
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setGalleryPreviewId(null);
              }}
              onTouchStart={(e) => e.stopPropagation()}
            >
              ✕
            </button>
          </div>
        )}

      </div>
    );
  };

  const renderBroadcast = () => {
    const mailReady = adminState.broadcastMailConfigured === true;
    const mailChecking = adminState.broadcastMailConfigured === null;

    const handleSubmit = async (e) => {
      e.preventDefault();
      setBroadcastError('');
      setBroadcastResult(null);
      if (!broadcastChannels.email && !broadcastChannels.dm) {
        setBroadcastError('Выберите хотя бы один канал');
        return;
      }
      if (broadcastChannels.email) {
        if (!mailReady) {
          setBroadcastError('Почта на сервере не настроена — отключите канал Email или настройте SMTP.');
          return;
        }
        if (!broadcastSubject.trim()) {
          setBroadcastError('Укажите тему письма');
          return;
        }
      }
      if (!broadcastBody.trim()) {
        setBroadcastError('Введите текст сообщения');
        return;
      }
      let userIds;
      if (broadcastScope === 'selected') {
        userIds = broadcastTargetIds.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
        if (userIds.length === 0) {
          setBroadcastError('Укажите UUID пользователей (через запятую или с новой строки)');
          return;
        }
      }
      const ok = window.confirm(
        broadcastScope === 'all'
          ? `Отправить рассылку всем подходящим пользователям (на сервере действует лимит получателей за один запрос)?`
          : `Отправить выбранным пользователям (${userIds.length} ID в списке)?`
      );
      if (!ok) return;

      setBroadcastLoading(true);
      const res = await adminState.sendBroadcast({
        channels: { email: broadcastChannels.email, dm: broadcastChannels.dm },
        scope: broadcastScope,
        userIds: broadcastScope === 'selected' ? userIds : undefined,
        filters: broadcastScope === 'all' ? { onlyActive: broadcastOnlyActive } : undefined,
        subject: broadcastSubject.trim(),
        body: broadcastBody
      });
      setBroadcastLoading(false);
      if (res.success) {
        setBroadcastResult(res.data);
      } else {
        setBroadcastError(res.error);
      }
    };

    return (
      <div className="admin-table-container">
        <div className="admin-toolbar" style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#ffd700', margin: 0 }}>✉️ Рассылка</h3>
        </div>

        <div style={{ padding: '0 20px 24px', maxWidth: 720 }}>
          <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.5, margin: '0 0 16px' }}>
            Массовая рассылка — всем пользователям (с фильтром по активным аккаунтам). Точечная — по списку UUID.
            Личные сообщения сохраняются в переписке; пользователи онлайн получат их сразу по WebSocket.
            Email отправляется только если на сервере заданы переменные SMTP (см. статус ниже).
          </p>

          <div
            style={{
              background: '#252525',
              border: '1px solid #444',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 20,
              fontSize: 13,
              color: mailChecking ? '#aaa' : mailReady ? '#8fbc8f' : '#ff9580'
            }}
          >
            {mailChecking && 'Проверка настроек почты…'}
            {!mailChecking && mailReady && '✓ SMTP настроен — рассылка по email доступна.'}
            {!mailChecking && !mailReady && 'Почта не настроена: нужны непустые SMTP_HOST и адрес отправителя (MAIL_FROM / EMAIL_FROM или часто тот же SMTP_USER), при необходимости SMTP_PASS.'}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#ddd' }}>Каналы</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={broadcastChannels.dm}
                  onChange={(e) => setBroadcastChannels((c) => ({ ...c, dm: e.target.checked }))}
                />
                Личные сообщения (ЛС)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: mailReady ? 'pointer' : 'not-allowed', opacity: mailReady ? 1 : 0.55 }}>
                <input
                  type="checkbox"
                  checked={broadcastChannels.email}
                  disabled={!mailReady}
                  onChange={(e) => setBroadcastChannels((c) => ({ ...c, email: e.target.checked }))}
                />
                Email на адрес из профиля
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#ddd' }}>Аудитория</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="bscope"
                  checked={broadcastScope === 'all'}
                  onChange={() => setBroadcastScope('all')}
                />
                Все пользователи
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="bscope"
                  checked={broadcastScope === 'selected'}
                  onChange={() => setBroadcastScope('selected')}
                />
                Только выбранные (UUID)
              </label>
            </div>

            {broadcastScope === 'all' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={broadcastOnlyActive}
                  onChange={(e) => setBroadcastOnlyActive(e.target.checked)}
                />
                Только активные аккаунты (не заблокированные)
              </label>
            )}

            {broadcastScope === 'selected' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontWeight: 600, color: '#ddd' }} htmlFor="broadcast-ids">
                    ID пользователей
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => {
                      const ids = adminState.users.map((u) => u.id).join('\n');
                      setBroadcastTargetIds(ids);
                      if (!ids) {
                        window.alert('Сначала откройте вкладку «Пользователи», чтобы список загрузился, затем вернитесь сюда.');
                      }
                    }}
                  >
                    Подставить из текущей страницы списка
                  </button>
                </div>
                <textarea
                  id="broadcast-ids"
                  value={broadcastTargetIds}
                  onChange={(e) => setBroadcastTargetIds(e.target.value)}
                  placeholder="Один UUID на строку или через запятую"
                  rows={5}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontSize: 13
                  }}
                />
              </div>
            )}

            {broadcastChannels.email && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, color: '#ddd' }} htmlFor="broadcast-subj">
                  Тема письма
                </label>
                <input
                  id="broadcast-subj"
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    padding: '10px 12px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, color: '#ddd' }} htmlFor="broadcast-body">
                Текст {broadcastChannels.email && broadcastChannels.dm ? '(общий для ЛС и email)' : ''}
              </label>
              <textarea
                id="broadcast-body"
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: 6,
                  color: '#e0e0e0',
                  padding: '10px 12px',
                  fontSize: 14,
                  lineHeight: 1.45
                }}
              />
            </div>

            {broadcastError && (
              <div className="admin-form__error" style={{ marginBottom: 12 }}>
                {broadcastError}
              </div>
            )}

            {broadcastResult && (
              <div
                style={{
                  background: '#1e2e1e',
                  border: '1px solid #3a5a3a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#c8e6c8'
                }}
              >
                <strong>Готово.</strong> Получателей в выборке: {broadcastResult.recipientCount}
                {broadcastChannels.dm && broadcastResult.dmSaved !== undefined && (
                  <>
                    <br />
                    ЛС сохранено: {broadcastResult.dmSaved}, доставлено онлайн: {broadcastResult.dmDeliveredLive}
                    {broadcastResult.dmFailed > 0 && `, ошибок: ${broadcastResult.dmFailed}`}
                  </>
                )}
                {broadcastChannels.email && (
                  <>
                    <br />
                    Email отправлено: {broadcastResult.emailSent}
                    {broadcastResult.emailSkippedNoAddress > 0 && `, без адреса: ${broadcastResult.emailSkippedNoAddress}`}
                    {broadcastResult.emailFailed > 0 && `, ошибок SMTP: ${broadcastResult.emailFailed}`}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={broadcastLoading}
              style={{ opacity: broadcastLoading ? 0.7 : 1 }}
            >
              {broadcastLoading ? 'Отправка…' : 'Отправить рассылку'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderCapabilities = () => {
    if (adminState.roleCapabilitiesLoading && !capEdit) {
      return (
        <div className="admin-content__section">
          <p style={{ color: '#aaa' }}>Загрузка настроек…</p>
        </div>
      );
    }
    if (adminState.roleCapabilitiesError && !capEdit) {
      return (
        <div className="admin-content__section">
          <p className="admin-form__error">{adminState.roleCapabilitiesError}</p>
        </div>
      );
    }
    const payload = adminState.roleCapabilitiesPayload;
    if (!capEdit || !payload?.featureIds?.length) {
      return (
        <div className="admin-content__section">
          <p style={{ color: '#aaa' }}>Нет данных. Откройте раздел ещё раз.</p>
        </div>
      );
    }

    const { featureDefs, roleLabels, featureIds, roleIds } = payload;

    const setFeatureMaster = (featureId, enabled) => {
      setCapEdit((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        if (!next.features[featureId]) next.features[featureId] = { enabled };
        next.features[featureId].enabled = enabled;
        return next;
      });
    };

    const setRoleFeature = (roleId, featureId, allowed) => {
      setCapEdit((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        if (!next.roles[roleId]) next.roles[roleId] = {};
        next.roles[roleId][featureId] = allowed;
        return next;
      });
    };

    const handleCapSave = async () => {
      setCapSaveFeedback(null);
      const result = await adminState.saveRoleCapabilities(capEdit);
      if (result.success) {
        setCapSaveFeedback({ ok: true, text: 'Сохранено. Изменения подхватятся у пользователей после обновления страницы.' });
        capabilitiesState.fetch();
      } else {
        setCapSaveFeedback({ ok: false, text: result.error || 'Ошибка сохранения' });
      }
    };

    const tableStyle = {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: 12,
      fontSize: 14,
    };
    const thStyle = {
      textAlign: 'left',
      padding: '10px 12px',
      borderBottom: '1px solid #444',
      color: '#bbb',
    };
    const tdStyle = {
      padding: '10px 12px',
      borderBottom: '1px solid #333',
      color: '#e0e0e0',
    };

    return (
      <div className="admin-content__section">
        <h2 style={{ marginTop: 0, color: '#eee', fontSize: '1.35rem' }}>Возможности по ролям</h2>
        <p style={{ color: '#999', maxWidth: 720, lineHeight: 1.5 }}>
          Здесь задаётся, какие функции доступны гостям (без регистрации), авторам (зарегистрированные пользователи),
          премиум-аккаунтам (роль в БД — premium) и администраторам. Глобальное отключение функции убирает её для всех,
          независимо от галочек у ролей.
        </p>

        {featureIds.map((featureId) => {
          const def = featureDefs[featureId] || { label: featureId, description: '' };
          const masterOn = capEdit.features[featureId]?.enabled !== false;
          return (
            <div
              key={featureId}
              style={{
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: 10,
                padding: '18px 20px',
                marginBottom: 20,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={masterOn}
                  onChange={(e) => setFeatureMaster(featureId, e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ color: '#fff', fontSize: 16 }}>{def.label}</strong>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 6, fontWeight: 400 }}>{def.description}</div>
                </span>
              </label>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Роль</th>
                    <th style={{ ...thStyle, width: 120 }}>Доступ</th>
                  </tr>
                </thead>
                <tbody>
                  {roleIds.map((roleId) => (
                    <tr key={`${featureId}-${roleId}`}>
                      <td style={tdStyle}>{roleLabels[roleId] || roleId}</td>
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!masterOn}
                          checked={masterOn && Boolean(capEdit.roles[roleId]?.[featureId])}
                          onChange={(e) => setRoleFeature(roleId, featureId, e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {capSaveFeedback && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 8,
              background: capSaveFeedback.ok ? '#1e2e1e' : '#2e1e1e',
              border: `1px solid ${capSaveFeedback.ok ? '#3a5a3a' : '#5a3a3a'}`,
              color: capSaveFeedback.ok ? '#c8e6c8' : '#e6a8a8',
              fontSize: 14,
            }}
          >
            {capSaveFeedback.text}
          </div>
        )}

        <button type="button" className="admin-btn admin-btn--primary" onClick={handleCapSave}>
          Сохранить возможности
        </button>
      </div>
    );
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__title">
          <DashboardIcon />
          Панель администратора
        </div>
        <div className="admin-header__user">
          <span>{userState.user?.username}</span>
          <button 
            className="admin-header__home" 
            onClick={() => navigate('/')}
            title="На главную"
          >
            <HomeIcon /> Главная
          </button>
          <button className="admin-header__logout" onClick={handleLogout}>
            <LogoutIcon /> Выйти
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button 
          className={`admin-nav__item ${adminState.activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            adminState.setActiveTab('dashboard');
            adminState.fetchStats();
          }}
        >
          Дашборд
        </button>
        <button 
          className={`admin-nav__item ${adminState.activeTab === 'users' ? 'active' : ''}`}
          onClick={() => adminState.setActiveTab('users')}
        >
          Пользователи
        </button>
        <button 
          className={`admin-nav__item ${adminState.activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => adminState.setActiveTab('rooms')}
        >
          Комнаты
        </button>
        <button
          className={`admin-nav__item ${adminState.activeTab === 'capabilities' ? 'active' : ''}`}
          onClick={() => adminState.setActiveTab('capabilities')}
        >
          Возможности
        </button>
        <button
          className={`admin-nav__item ${adminState.activeTab === 'gameModes' ? 'active' : ''}`}
          onClick={() => {
            adminState.setActiveTab('gameModes');
            adminState.fetchColoringPages();
          }}
        >
          🎮 Игровые режимы
        </button>
        <button
          className={`admin-nav__item ${adminState.activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => {
            adminState.setActiveTab('gallery');
          }}
        >
          🖼️ Галерея
          {adminState.galleryPending.length > 0 && (
            <span style={{
              marginLeft: '6px',
              background: '#ff6699',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 7px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {adminState.galleryPending.length}
            </span>
          )}
        </button>
        <button
          className={`admin-nav__item ${adminState.activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => adminState.setActiveTab('broadcast')}
        >
          ✉️ Рассылка
        </button>
      </nav>

      <main className="admin-content">
        {adminState.activeTab === 'dashboard' && renderDashboard()}
        {adminState.activeTab === 'users' && renderUsers()}
        {adminState.activeTab === 'rooms' && renderRooms()}
        {adminState.activeTab === 'capabilities' && renderCapabilities()}
        {adminState.activeTab === 'gameModes' && renderGameModes()}
        {adminState.activeTab === 'gallery' && renderGallery()}
        {adminState.activeTab === 'broadcast' && renderBroadcast()}
      </main>

      {renderUserModal()}
      {renderRoomModal()}
      {renderPasswordModal()}
      {renderDeleteConfirm()}
    </div>
  );
});

export default AdminPage;
