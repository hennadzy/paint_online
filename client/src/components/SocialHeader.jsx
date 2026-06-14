import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import userState from '../store/userState';
import NotificationsDropdown from './NotificationsDropdown';
import PersonalMessagesModal from './PersonalMessagesModal';
import '../styles/social-header.scss';

const SocialHeader = observer(({
  title,
  backLabel = '← На главную',
  backTo = '/',
  onBack
}) => {
  const navigate = useNavigate();
  const [showMessages, setShowMessages] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(backTo);
  };

  return (
    <>
      <header className="social-header">
        <button
          type="button"
          className="social-header__back"
          onClick={handleBack}
          aria-label={backLabel}
        >
          {backLabel}
        </button>

        <h1 className="social-header__title">{title}</h1>

        <div className="social-header__actions">
          {userState.isAuthenticated ? (
            <>
              <button
                type="button"
                className={`social-header__icon-btn ${userState.unreadMessagesCount > 0 ? 'has-badge' : ''}`}
                onClick={() => setShowMessages(true)}
                title="Личные сообщения"
                aria-label="Личные сообщения"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {userState.unreadMessagesCount > 0 && (
                  <span className="social-header__badge">{userState.unreadMessagesCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`social-header__icon-btn ${userState.incomingFriendRequestsCount > 0 ? 'has-badge' : ''}`}
                onClick={() => navigate('/friends')}
                title="Друзья"
                aria-label="Друзья"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {userState.incomingFriendRequestsCount > 0 && (
                  <span className="social-header__badge">{userState.incomingFriendRequestsCount}</span>
                )}
              </button>

              <NotificationsDropdown />

              <button
                type="button"
                className="social-header__icon-btn"
                onClick={() => navigate(`/user/${userState.user?.id}`)}
                title="Мой профиль"
                aria-label="Мой профиль"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="social-header__text-btn"
              onClick={() => navigate('/login')}
            >
              Войти
            </button>
          )}
        </div>
      </header>

      {userState.toastMessage && (
        <div className="social-toast" role="status">{userState.toastMessage}</div>
      )}

      <PersonalMessagesModal
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
      />
    </>
  );
});

export default SocialHeader;
