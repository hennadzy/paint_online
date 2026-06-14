import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import userState from '../store/userState';

const FriendActions = observer(({ userId, friendshipStatus, onStatusChange, compact = false }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const runAction = async (action) => {
    if (!userState.isAuthenticated) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const result = await action();
      if (onStatusChange) {
        onStatusChange(result?.status || friendshipStatus?.status);
      }
    } catch (err) {
      userState.showToast(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const status = friendshipStatus?.status;

  if (status === 'self') return null;

  if (!userState.isAuthenticated) {
    return (
      <button
        type="button"
        className="profile-btn profile-btn-primary friend-action-btn"
        onClick={() => navigate('/login')}
      >
        Войти, чтобы добавить в друзья
      </button>
    );
  }

  const btnClass = compact
    ? 'profile-btn profile-btn-small friend-action-btn'
    : 'profile-btn profile-btn-primary friend-action-btn';

  if (status === 'friends') {
    return (
      <button
        type="button"
        className={`${btnClass} friend-action-btn--danger`}
        disabled={loading}
        onClick={() => runAction(() => userState.removeFriend(userId).then(() => ({ status: 'none' })))}
      >
        ✕ Удалить из друзей
      </button>
    );
  }

  if (status === 'pending_outgoing') {
    return (
      <button
        type="button"
        className={`${btnClass} profile-btn-secondary`}
        disabled={loading}
        onClick={() => runAction(() => userState.cancelFriendRequest(userId).then(() => ({ status: 'none' })))}
      >
        Отменить заявку
      </button>
    );
  }

  if (status === 'pending_incoming') {
    return (
      <div className="friend-action-group">
        <button
          type="button"
          className={btnClass}
          disabled={loading}
          onClick={() => runAction(() => userState.acceptFriendRequest(userId).then(() => ({ status: 'friends' })))}
        >
          ✓ Подтвердить
        </button>
        <button
          type="button"
          className={`${btnClass} profile-btn-secondary`}
          disabled={loading}
          onClick={() => runAction(() => userState.declineFriendRequest(userId).then(() => ({ status: 'none' })))}
        >
          ✕ Отклонить
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      disabled={loading}
      onClick={() => runAction(() => userState.sendFriendRequest(userId).then((r) => ({ status: r.status === 'accepted' ? 'friends' : 'pending_outgoing' })))}
    >
      + Добавить в друзья
    </button>
  );
});

export default FriendActions;
