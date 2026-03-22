import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import WebSocketService from '../services/WebSocketService';
import { API_URL } from '../store/canvasState';
import axios from 'axios';
import '../styles/personal-messages.scss';

const PersonalMessagesModal = observer(({ isOpen, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Определяем, является ли устройство мобильным
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Load conversations from localStorage
      try {
        const savedConversations = localStorage.getItem('personalConversations');
        if (savedConversations) {
          setConversations(JSON.parse(savedConversations));
        }
        
        // Fetch real users from the server
        fetchUsers();
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch active users from the server
      const response = await axios.get(`${API_URL}/users/active`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Filter out non-existent users from conversations
        const activeUserIds = new Set(response.data.map(user => user.id));
        const validUsers = response.data.filter(user => 
          user.id !== userState.user?.id && // Don't include current user
          user.is_active !== false // Filter out inactive users
        );
        
        setUsers(validUsers);
        
        // Clean up conversations for non-existent users
        const updatedConversations = { ...conversations };
        Object.keys(updatedConversations).forEach(userId => {
          if (!activeUserIds.has(userId) && userId !== 'system') {
            delete updatedConversations[userId];
          }
        });
        
        setConversations(updatedConversations);
        localStorage.setItem('personalConversations', JSON.stringify(updatedConversations));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedUser, conversations]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Filter out current user and inactive users
        const filteredResults = response.data.filter(user => 
          user.id !== userState.user?.id && 
          user.is_active !== false
        );
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveMessage = (data) => {
    const { from, message, timestamp } = data;
    
    setConversations(prev => {
      const newConversations = { ...prev };
      if (!newConversations[from]) {
        newConversations[from] = [];
      }
      
      newConversations[from].push({
        sender: from,
        text: message,
        timestamp: timestamp || Date.now()
      });
      
      // Save to localStorage
      localStorage.setItem('personalConversations', JSON.stringify(newConversations));
      
      return newConversations;
    });
    
    // Notify user about new message
    if (document.hidden && Notification.permission === 'granted') {
      const sender = users.find(u => u.id === from)?.username || 'User';
      new Notification(`New message from ${sender}`, {
        body: message,
        icon: '/favicon.png'
      });
    }
  };

  const addUserToContacts = (user) => {
    // Add user to contacts and start conversation
    setSelectedUser(user);
    setIsSearching(false);
    setSearchQuery('');
    
    // Make sure user is in the users list
    if (!users.some(u => u.id === user.id)) {
      setUsers(prev => [...prev, user]);
    }
  };

  const handleSendMessage = () => {
    if (!selectedUser || !message.trim()) return;
    
    const timestamp = Date.now();
    
    // Send message via WebSocket
    if (WebSocketService.isConnected) {
      WebSocketService.sendPersonalMessage(selectedUser.id, message.trim(), timestamp);
    }
    
    // Update local state
    setConversations(prev => {
      const newConversations = { ...prev };
      if (!newConversations[selectedUser.id]) {
        newConversations[selectedUser.id] = [];
      }
      
      newConversations[selectedUser.id].push({
        sender: userState.user?.id || 'me',
        text: message.trim(),
        timestamp
      });
      
      // Save to localStorage
      localStorage.setItem('personalConversations', JSON.stringify(newConversations));
      
      return newConversations;
    });
    
    setMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="room-interface-overlay" onClick={onClose} data-nosnippet>
      <div className="room-interface personal-messages-modal" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={onClose}>×</button>
        
        <div className={`personal-messages-container ${isMobileView && selectedUser ? 'show-chat' : 'show-contacts'}`}>
          <div className={`sidebar ${isMobileView && selectedUser ? '' : 'active'}`}>
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Поиск пользователей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="search-btn"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? '...' : '🔍'}
              </button>
            </div>
            
            {isSearching ? (
              <div className="search-results">
                <div className="section-header">
                  <h3>Результаты поиска</h3>
                  <button 
                    className="back-btn"
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery('');
                    }}
                  >
                    Назад
                  </button>
                </div>
                
                {searchResults.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <p>Пользователи не найдены</p>
                  </div>
                ) : (
                  <ul className="users-list">
                    {searchResults.map(user => (
                      <li 
                        key={user.id} 
                        className="user-item"
                        onClick={() => addUserToContacts(user)}
                      >
                        <div className="user-avatar">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} />
                          ) : (
                            <span>{user.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{user.username}</span>
                          <span className="user-status">
                      {user.is_online ? 'В сети' : 'Не в сети'}
                          </span>
                        </div>
                        <button className="add-user-btn">Добавить</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="contacts">
                <h3>Контакты</h3>
                {users.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">👥</span>
                    <p>Пока нет контактов</p>
                    <p className="empty-hint">Найдите пользователей, чтобы начать общение</p>
                  </div>
                ) : (
                  <ul className="users-list">
                    {users.map(user => {
                      const unreadCount = conversations[user.id]?.filter(
                        msg => msg.sender === user.id && !msg.read
                      ).length || 0;
                      
                      return (
                        <li 
                          key={user.id} 
                          className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <div className="user-avatar">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} />
                            ) : (
                              <span>{user.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="user-info">
                            <span className="user-name">{user.username}</span>
                            {conversations[user.id] && conversations[user.id].length > 0 && (
                              <span className="last-message">
                                {conversations[user.id][conversations[user.id].length - 1].text.substring(0, 20)}
                                {conversations[user.id][conversations[user.id].length - 1].text.length > 20 ? '...' : ''}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <div className="chat-area">
            {selectedUser ? (
              <>
                <div className="chat-header">
                  {isMobileView && (
                    <button 
                      className="back-to-contacts" 
                      onClick={() => setSelectedUser(null)}
                    >
                      ←
                    </button>
                  )}
                  <div className="user-avatar">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt={selectedUser.username} />
                    ) : (
                      <span>{selectedUser.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <h3>{selectedUser.username}</h3>
                    <span className="user-status">
                      {selectedUser.is_online ? 'В сети' : 'Не в сети'}
                    </span>
                  </div>
                </div>
                
                <div className="messages-list">
                  {!conversations[selectedUser.id] || conversations[selectedUser.id].length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">💬</span>
                      <p>Пока нет сообщений</p>
                      <p className="empty-hint">Начните разговор</p>
                    </div>
                  ) : (
                    conversations[selectedUser.id].map((msg, index) => {
                      const isSentByMe = msg.sender === userState.user?.id || msg.sender === 'me';
                      const messageDate = new Date(msg.timestamp);
                      
                      return (
                        <div 
                          key={index} 
                          className={`message ${isSentByMe ? 'sent' : 'received'}`}
                        >
                          <div className="message-content">
                            <p>{msg.text}</p>
                            <span className="message-time">
                              {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="message-input-container">
                  <input
                    type="text"
                    className="message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    className="send-btn"
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
                <p>Выберите контакт, чтобы начать общение</p>
                <p className="empty-hint">Или найдите новых пользователей</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PersonalMessagesModal;
