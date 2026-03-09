import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import adminState from '../store/adminState';
import userState from '../store/userState';
import '../styles/admin.scss';

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
                      <td colSpan="7" className="admin-empty">
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
      </nav>

      <main className="admin-content">
        {adminState.activeTab === 'dashboard' && renderDashboard()}
        {adminState.activeTab === 'users' && renderUsers()}
        {adminState.activeTab === 'rooms' && renderRooms()}
      </main>

      {renderUserModal()}
      {renderRoomModal()}
      {renderPasswordModal()}
      {renderDeleteConfirm()}
    </div>
  );
});

export default AdminPage;
