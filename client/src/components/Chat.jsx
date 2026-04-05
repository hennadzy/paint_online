import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import userState from "../store/userState";
import PersonalMessagesModal from "./PersonalMessagesModal";

const sanitizeMessage = (text) => {
  if (typeof text !== 'string') return '';

  let sanitized = text.trim();

  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000);
  }

  sanitized = sanitized.normalize('NFKC');

  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  const dangerousPatterns = [
    /<script/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /onerror/gi,
    /onload/gi
  ];

  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
};

const Chat = observer(() => {
  const inputRef = useRef();
  const messagesRef = useRef();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showPersonalMessages, setShowPersonalMessages] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    if (messagesRef.current) {
      const lastMessage = messagesRef.current.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [canvasState.chatMessages.length]);

  if (!canvasState.isConnected) return null;

  const sendMessage = (e) => {
    if (e && e.key === "Enter" && inputRef.current.value.trim()) {
      handleSend();
    }
  };

const handleInvite = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка скопирована в буфер обмена');
      }).catch(() => {
        alert('Не удалось скопировать ссылку');
      });
    }
  };

  const handleUserClick = (user) => {
    // Проверяем, что пользователь авторизован и клик по авторизованному пользователю
    if (!userState.isAuthenticated) return;

    const userId = typeof user === 'object' ? user.id : null;
    const isVerified = typeof user === 'object' ? user.isVerified : false;

    // Открываем ЛС только для авторизованных пользователей
    if (isVerified && userId) {
      const username = typeof user === 'object' ? user.username : user;
      setSelectedChatUser({ id: userId, username, is_online: true });
      setShowPersonalMessages(true);
    }
  };

  const handleClosePersonalMessages = () => {
    setShowPersonalMessages(false);
    setSelectedChatUser(null);
  };
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    const message = sanitizeMessage(inputRef.current.value);
    if (message && message.trim().length > 0 && !isSending) {
      setIsSending(true);
      canvasState.sendChatMessage(message);
      inputRef.current.value = "";
      
      setTimeout(() => {
        setIsSending(false);
      }, 1000);
    }
  };

return (
    <>
      <div className="chat" data-nosnippet>
        <div className="chat-users">
          <h4>Пользователи:</h4>
          {userState.isAuthenticated && (
            <div className="chat-users-hint">
              Нажмите на имя с ✓, чтобы открыть ЛС
            </div>
          )}
          <div className="chat-users-list">
            {canvasState.users.map((user, index) => {
              const isVerified = typeof user === 'object' ? user.isVerified : false;
              const username = typeof user === 'object' ? user.username : user;
              const isClickable = userState.isAuthenticated && isVerified;

              return (
                <div
                  key={index}
                  className={`chat-user ${isVerified ? 'chat-user--verified' : ''} ${isClickable ? 'chat-user--clickable' : ''}`}
                  onClick={() => isClickable && handleUserClick(user)}
                  title={isClickable ? `Открыть ЛС с ${username}` : (isVerified ? 'Авторизованный пользователь' : 'ЛС доступны только для авторизованных')}
                >
                  {username}
                  {isVerified && (
                    <span className="chat-user-check" title="Авторизованный пользователь"> ✓</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="chat-invite-container">
            <button className="chat-invite-btn" onClick={handleInvite}>
              Пригласить
            </button>
          </div>
        </div>
        <div className="chat-main">
          <div className="chat-messages" ref={messagesRef}>
            {canvasState.chatMessages.map((msg, index) => {
              const isClickable = userState.isAuthenticated && msg.isVerified && msg.userId;
              return (
                <div key={index} className="chat-message">
                  {msg.type === "system" ? (
                    <>
                      <span style={{color: '#ff6699'}}>{msg.username}</span> {msg.message}
                    </>
                  ) : (
                    <>
                      <strong
                        className={isClickable ? 'chat-message-username--clickable' : ''}
                        onClick={() => isClickable && handleUserClick({ id: msg.userId, username: msg.username, isVerified: msg.isVerified })}
                        title={isClickable ? `Открыть ЛС с ${msg.username}` : ''}
                      >
                        {msg.username}
                      </strong>
                      {msg.isVerified && <span className="chat-user-check" title="Авторизованный пользователь"> ✓</span>}
                      : {msg.message}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="chat-input-container">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Введите сообщение"
              onKeyDown={sendMessage}
            />
            <button
              className={`chat-send-btn ${isSending ? 'chat-send-btn--disabled' : ''}`}
              onClick={handleSend}
              title="Отправить"
              disabled={isSending}
            >
              ↵
            </button>
          </div>
        </div>
      </div>

{showPersonalMessages && (
        <PersonalMessagesModal
          isOpen={showPersonalMessages}
          onClose={handleClosePersonalMessages}
          initialUser={selectedChatUser}
        />
      )}
    </>
  );
});

export default Chat;
