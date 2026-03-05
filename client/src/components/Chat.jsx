import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";

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
  const handleSend = () => {
    const message = sanitizeMessage(inputRef.current.value);
    if (message && message.trim().length > 0) {
      canvasState.sendChatMessage(message);
      inputRef.current.value = "";
    }
  };

  return (
    <div className="chat" data-nosnippet>
      <div className="chat-main">
        <div className="chat-messages" ref={messagesRef}>
          {canvasState.chatMessages.map((msg, index) => (
            <div key={index} className="chat-message">
              {msg.type === "system" ? (
                <>
                  <span style={{color: '#ff6699'}}>{msg.username}</span> {msg.message}
                </>
              ) : (
                <>
                  <strong>{msg.username}:</strong> {msg.message}
                </>
              )}
            </div>
          ))}
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
            className="chat-send-btn"
            onClick={handleSend}
            title="Отправить"
          >
            ↵
          </button>
        </div>
      </div>
      <div className="chat-users">
        <h4>Пользователи:</h4>
        {canvasState.users.map((user, index) => (
          <div key={index} className="chat-user">
            {user}
          </div>
        ))}
        {windowWidth <= 768 && (
          <button className="chat-invite-btn" onClick={handleInvite}>
            Пригласить
          </button>
        )}
      </div>
    </div>
  );
});

export default Chat;
