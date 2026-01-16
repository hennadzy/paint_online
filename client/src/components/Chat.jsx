import React, { useRef, useLayoutEffect } from "react";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";

const Chat = observer(() => {
  const inputRef = useRef();
  const messagesRef = useRef();

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

  const handleSend = () => {
    const message = inputRef.current.value.trim();
    if (message) {
      if (canvasState.socket) {
        canvasState.socket.send(JSON.stringify({
          method: "chat",
          id: canvasState.sessionid,
          username: canvasState.username,
          message
        }));
      }
      canvasState.addChatMessage({ type: "chat", username: canvasState.username, message });
      inputRef.current.value = "";
    }
  };

  return (
    <div className="chat" data-nosnippet>
      <div className="chat-users">
        <h4>Пользователи:</h4>
        {canvasState.users.map((user, index) => (
          <div key={index} className="chat-user">
            {user}
          </div>
        ))}
      </div>
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
        >
          Отправить
        </button>
      </div>
    </div>
  );
});

export default Chat;
