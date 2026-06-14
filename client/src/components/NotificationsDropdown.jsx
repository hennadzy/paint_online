import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import userState from '../store/userState';

const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='80' r='40' fill='%23cccccc'/%3E%3Cpath d='M30 170 Q100 130, 170 170' stroke='%23cccccc' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

const notificationText = (n) => {
  switch (n.type) {
    case 'friend_request':
      return 'добавил(а) вас в друзья';
    case 'friend_accepted':
      return 'подтвердил(а) вашу заявку в друзья';
    case 'drawing_liked':
      return `лайкнул(а) рисунок «${n.entityTitle || 'без названия'}»`;
    default:
      return 'новое событие';
  }
};

const NotificationsDropdown = observer(() => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!userState.isAuthenticated) return;
    userState.fetchNotifications();
    userState.fetchIncomingFriendRequestsCount();
  }, [userState.isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      userState.fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await userState.markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.type === 'drawing_liked' && notification.entityId) {
      navigate(`/gallery/${notification.entityId}`);
    } else if (notification.actorId) {
      navigate(`/user/${notification.actorId}`);
    }
  };

  const handleAcceptFriend = async (e, actorId) => {
    e.stopPropagation();
    await userState.acceptFriendRequest(actorId);
    await userState.fetchNotifications();
    await userState.fetchIncomingFriendRequestsCount();
  };

  return (
    <div className="notifications-dropdown" ref={ref}>
      <button
        type="button"
        className={`social-header__icon-btn ${userState.unreadNotificationsCount > 0 ? 'has-badge' : ''}`}
        onClick={handleOpen}
        title="Уведомления"
        aria-label="Уведомления"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {userState.unreadNotificationsCount > 0 && (
          <span className="social-header__badge">{userState.unreadNotificationsCount}</span>
        )}
      </button>

      {open && (
        <div className="notifications-dropdown__panel">
          <div className="notifications-dropdown__head">
            <span>Уведомления</span>
            {userState.unreadNotificationsCount > 0 && (
              <button
                type="button"
                className="notifications-dropdown__read-all"
                onClick={() => userState.markAllNotificationsRead()}
              >
                Прочитать все
              </button>
            )}
          </div>

          {userState.notifications.length === 0 ? (
            <div className="notifications-dropdown__empty">Пока нет уведомлений</div>
          ) : (
            <ul className="notifications-dropdown__list">
              {userState.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notifications-dropdown__item ${n.isRead ? '' : 'unread'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <img
                      src={n.actorAvatarUrl || defaultAvatar}
                      alt=""
                      className="notifications-dropdown__avatar"
                    />
                    <div className="notifications-dropdown__content">
                      <span className="notifications-dropdown__text">
                        <strong>{n.actorUsername}</strong> {notificationText(n)}
                      </span>
                      {n.type === 'friend_request' && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="notifications-dropdown__accept"
                          onClick={(e) => handleAcceptFriend(e, n.actorId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              handleAcceptFriend(e, n.actorId);
                            }
                          }}
                        >
                          ✓ Подтвердить
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

export default NotificationsDropdown;
