import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useSearchParams } from 'react-router-dom';
import userState from '../store/userState';
import SocialHeader from './SocialHeader';
import FriendActions from './FriendActions';
import { useSeo } from './SeoMeta';
import '../styles/profile.scss';
import '../styles/friends.scss';

const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='80' r='40' fill='%23cccccc'/%3E%3Cpath d='M30 170 Q100 130, 170 170' stroke='%23cccccc' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

const TABS = [
  { id: 'find', label: 'Найти людей' },
  { id: 'friends', label: 'Мои друзья' },
  { id: 'incoming', label: 'Входящие заявки' },
  { id: 'outgoing', label: 'Исходящие заявки' }
];

const FriendsPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSeoData } = useSeo();
  const [tab, setTab] = useState(() => {
    const initial = searchParams.get('tab');
    return ['find', 'friends', 'incoming', 'outgoing'].includes(initial) ? initial : 'find';
  });
  const [search, setSearch] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchStatuses, setUserSearchStatuses] = useState({});
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userState.isAuthenticated) return;
    setLoading(true);
    try {
      const [friendsList, incomingList, outgoingList] = await Promise.all([
        userState.fetchFriends(search),
        userState.fetchIncomingFriendRequests(),
        userState.fetchOutgoingFriendRequests()
      ]);
      setFriends(friendsList);
      setIncoming(incomingList);
      setOutgoing(outgoingList);
      await userState.fetchIncomingFriendRequestsCount();
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setSeoData({
      title: 'Друзья — Рисование.Онлайн',
      description: 'Управление списком друзей и заявками. Страница доступна только авторизованным пользователям.',
      robots: 'noindex, nofollow',
      canonical: 'https://risovanie.online/friends'
    });
    return () => setSeoData(null);
  }, [setSeoData]);

  useEffect(() => {
    if (!userState.isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [loadData, navigate, userState.isAuthenticated]);

  useEffect(() => {
    if (!userState.isAuthenticated || tab !== 'friends') return;
    const timer = setTimeout(() => {
      userState.fetchFriends(search).then(setFriends);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab]);

  useEffect(() => {
    if (!userState.isAuthenticated || tab !== 'find') return undefined;
    if (userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return undefined;
    }

    setUserSearchLoading(true);
    const timer = setTimeout(async () => {
      const results = await userState.searchUsers(userSearchQuery);
      setUserSearchResults(results);
      setUserSearchStatuses(
        results.reduce((acc, user) => {
          acc[user.id] = user.friendshipStatus || 'none';
          return acc;
        }, {})
      );
      setUserSearchLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [userSearchQuery, tab]);

  const handleRemoveFriend = async (userId) => {
    await userState.removeFriend(userId);
    await loadData();
  };

  const handleSearchStatusChange = (userId, status) => {
    setUserSearchStatuses(prev => ({ ...prev, [userId]: status }));
    if (status === 'friends' || status === 'none') {
      userState.fetchFriends();
    }
    if (status !== 'pending_outgoing') {
      userState.fetchIncomingFriendRequestsCount();
    }
  };

  const renderFindPeople = () => (
    <>
      <div className="friends-search">
        <input
          type="search"
          className="profile-input"
          placeholder="Имя пользователя (минимум 2 символа)..."
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
        />
        <p className="friends-search-hint">Найдите пользователя по имени и отправьте заявку в друзья</p>
      </div>
      {userSearchLoading && (
        <div className="profile-loading"><div className="spinner" /></div>
      )}
      {!userSearchLoading && userSearchQuery.trim().length >= 2 && userSearchResults.length === 0 && (
        <p className="profile-empty">Пользователи не найдены</p>
      )}
      {!userSearchLoading && userSearchResults.length > 0 && (
        <ul className="friends-list">
          {userSearchResults.map(user => (
            <li key={user.id} className="friends-list__item">
              <button
                type="button"
                className="friends-list__profile"
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <img src={user.avatar_url || defaultAvatar} alt="" className="friends-list__avatar" />
                <span className="friends-list__name">{user.username}</span>
              </button>
              <FriendActions
                userId={user.id}
                friendshipStatus={{ status: userSearchStatuses[user.id] || user.friendshipStatus || 'none' }}
                onStatusChange={(status) => handleSearchStatusChange(user.id, status)}
                compact
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const renderFriends = () => {
    if (friends.length === 0) {
      return (
        <p className="profile-empty">
          У вас пока нет друзей.{' '}
          <button type="button" className="profile-friends-preview__link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffcc00' }} onClick={() => setTab('find')}>
            Найти людей
          </button>
        </p>
      );
    }
    return (
      <ul className="friends-list">
        {friends.map(friend => (
          <li key={friend.id} className="friends-list__item">
            <button
              type="button"
              className="friends-list__profile"
              onClick={() => navigate(`/user/${friend.id}`)}
            >
              <img src={friend.avatar_url || defaultAvatar} alt="" className="friends-list__avatar" />
              <span className="friends-list__name">{friend.username}</span>
            </button>
            <button
              type="button"
              className="profile-btn profile-btn-secondary profile-btn-small"
              onClick={() => handleRemoveFriend(friend.id)}
            >
              ✕ Удалить
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const renderIncoming = () => {
    if (incoming.length === 0) {
      return <p className="profile-empty">Нет входящих заявок</p>;
    }
    return (
      <ul className="friends-list">
        {incoming.map(req => (
          <li key={req.id} className="friends-list__item">
            <button
              type="button"
              className="friends-list__profile"
              onClick={() => navigate(`/user/${req.id}`)}
            >
              <img src={req.avatar_url || defaultAvatar} alt="" className="friends-list__avatar" />
              <span className="friends-list__name">{req.username}</span>
            </button>
            <FriendActions
              userId={req.id}
              friendshipStatus={{ status: 'pending_incoming' }}
              onStatusChange={() => loadData()}
              compact
            />
          </li>
        ))}
      </ul>
    );
  };

  const renderOutgoing = () => {
    if (outgoing.length === 0) {
      return <p className="profile-empty">Нет исходящих заявок</p>;
    }
    return (
      <ul className="friends-list">
        {outgoing.map(req => (
          <li key={req.id} className="friends-list__item">
            <button
              type="button"
              className="friends-list__profile"
              onClick={() => navigate(`/user/${req.id}`)}
            >
              <img src={req.avatar_url || defaultAvatar} alt="" className="friends-list__avatar" />
              <span className="friends-list__name">{req.username}</span>
            </button>
            <FriendActions
              userId={req.id}
              friendshipStatus={{ status: 'pending_outgoing' }}
              onStatusChange={() => loadData()}
              compact
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="profile-page friends-page">
      <SocialHeader title="Друзья" backTo="/" />

      <div className="profile-container friends-container">
        <div className="friends-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`friends-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'incoming' && userState.incomingFriendRequestsCount > 0 && (
                <span className="friends-tab__badge">{userState.incomingFriendRequestsCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'friends' && (
          <div className="friends-search">
            <input
              type="search"
              className="profile-input"
              placeholder="Поиск по друзьям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {tab === 'find' ? (
          renderFindPeople()
        ) : loading ? (
          <div className="profile-loading"><div className="spinner" /></div>
        ) : (
          <>
            {tab === 'friends' && renderFriends()}
            {tab === 'incoming' && renderIncoming()}
            {tab === 'outgoing' && renderOutgoing()}
          </>
        )}
      </div>
    </div>
  );
});

export default FriendsPage;
