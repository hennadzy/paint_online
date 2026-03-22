import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import WebSocketService from '../services/WebSocketService';

const PersonalMessagesModal = observer(({ isOpen, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Load users and conversations from localStorage
      try {
        const savedConversations = localStorage.getItem('personalConversations');
        if (savedConversations) {
          setConversations(JSON.parse(savedConversations));
        }
        
        // In a real app, we would fetch users from the server
        // For now, we'll use the activity rooms to get users
        if (userState.activityRooms.length > 0) {
          const uniqueUsers = new Set();
          userState.activityRooms.forEach(room => {
            // In a real implementation, we would get users from each room
            // For now, we'll just add some placeholder users
            uniqueUsers.add('User1');
            uniqueUsers.add('User2');
            uniqueUsers.add('User3');
          });
          setUsers(Array.from(uniqueUsers));
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
      
      // Set up WebSocket listener for personal messages
      WebSocketService.on('personalMessage', handleReceiveMessage);
    }
    
    return () => {
      // Clean up WebSocket listener
      WebSocketService.off('personalMessage', handleReceiveMessage);
    };
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedUser, conversations]);

  const handleReceiveMessage = (data) => {
    const { from, message } = data;
    
    setConversations(prev => {
      const newConversations = { ...prev };
      if (!newConversations[from]) {
        newConversations[from] = [];
      }
      
      newConversations[from].push({
        sender: from,
        text: message,
        timestamp: Date.now()
      });
      
      // Save to localStorage
      localStorage.setItem('personalConversations', JSON.stringify(newConversations));
      
      return newConversations;
    });
  };

  const handleSendMessage = () => {
    if (!selectedUser || !message.trim()) return;
    
    // In a real app, we would send this via WebSocket
    // For now, we'll just update the local state
    setConversations(prev => {
      const newConversations = { ...prev };
      if (!newConversations[selectedUser]) {
        newConversations[selectedUser] = [];
      }
      
      newConversations[selectedUser].push({
        sender: userState.user?.username || 'Me',
        text: message.trim(),
        timestamp: Date.now()
      });
      
      // Save to localStorage
      localStorage.setItem('personalConversations', JSON.stringify(newConversations));
      
      return newConversations;
    });
    
    // In a real implementation, we would send via WebSocket:
    // WebSocketService.sendPersonalMessage(selectedUser, message.trim());
    
    setMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="room-interface-overlay" onClick={onClose} data-nosnippet>
      <div className="room-interface" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={onClose}>×</button>
        
        <div className="room-card">
          <div className="room-card-header">
            <h2>Личные сообщения</h2>
            <p>Общайтесь с другими пользователями</p>
          </div>
          
          <div className="room-card-body personal-messages-container">
            <div className="users-list">
              <h3>Пользователи</h3>
              {users.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">👥</span>
                  <p>Нет доступных пользователей</p>
                  <p className="empty-hint">Посетите комнаты, чтобы найти собеседников</p>
                </div>
              ) : (
                <ul className="users-list-items">
                  {users.map(user => (
                    <li 
                      key={user} 
                      className={`user-item ${selectedUser === user ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <span className="user-avatar">👤</span>
                      <span className="user-name">{user}</span>
                      {conversations[user] && conversations[user].length > 0 && (
                        <span className="message-count">{conversations[user].length}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="messages-area">
              {selectedUser ? (
                <>
                  <div className="messages-header">
                    <h3>{selectedUser}</h3>
                  </div>
                  
                  <div className="messages-list">
                    {!conversations[selectedUser] || conversations[selectedUser].length === 0 ? (
                      <div className="empty-state">
                        <span className="empty-icon">💬</span>
                        <p>Нет сообщений</p>
                        <p className="empty-hint">Начните общение прямо сейчас</p>
                      </div>
                    ) : (
                      conversations[selectedUser].map((msg, index) => (
                        <div 
                          key={index} 
                          className={`message ${msg.sender === (userState.user?.username || 'Me') ? 'sent' : 'received'}`}
                        >
                          <div className="message-content">
                            <p>{msg.text}</p>
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="message-input-container">
                    <input
                      type="text"
                      className="room-input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                      className="room-btn room-btn-primary"
                      onClick={handleSendMessage}
                      disabled={!message.trim() || loading}
                    >
                      Отправить
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">👈</span>
                  <p>Выберите пользователя для начала общения</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PersonalMessagesModal;
