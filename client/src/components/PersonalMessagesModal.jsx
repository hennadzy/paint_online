import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import WebSocketService from '../services/WebSocketService';
import { API_URL } from '../store/canvasState';
import axios from 'axios';
import '../styles/personal-messages.scss';

const getContactsKey = () => `personalContacts_${userState.user?.id || 'guest'}`;

const PersonalMessagesModal = observer(({ isOpen, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Загружаем контакты из localStorage при открытии
  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedContacts = localStorage.getItem(getContactsKey());
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, [isOpen]);

  // Загружаем историю для всех контактов при открытии модалки (Issue #4)
  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const loadAllHistory = async () => {
      try {
        const savedContacts = localStorage.getItem(getContactsKey());
        if (!savedContacts) return;
        const contactList = JSON.parse(savedContacts);
        if (!contactList || contactList.length === 0) return;

        const myId = userState.user?.id;
        const newConversations = {};

        await Promise.all(contactList.map(async (contact) => {
          try {
            const response = await axios.get(
              `${API_URL}/api/users/messages/${contact.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (Array.isArray(response.data) && response.data.length > 0) {
              newConversations[contact.id] = response.data.map(m => ({
                sender: m.from_user_id === myId ? myId : m.from_user_id,
                text: m.message,
                timestamp: m.timestamp
              }));
            }
          } catch (_) {}
        }));

        if (Object.keys(newConversations).length > 0) {
          setConversations(prev => ({ ...prev, ...newConversations }));
        }
      } catch (error) {
        console.error('Error loading all history:', error);
      }
    };

    loadAllHistory();
  }, [isOpen]);

  // Обработчик входящих сообщений через WebSocket
  const handleReceiveMessage = useCallback((data) => {
    const { from, fromUsername, message: text, timestamp } = data;

    setContacts(prev => {
      if (prev.some(c => c.id === from)) return prev;
      const updated = [...prev, { id: from, username: fromUsername || from, is_online: true }];
      localStorage.setItem(getContactsKey(), JSON.stringify(updated));
      return updated;
    });

    setConversations(prev => {
      const next = { ...prev };
      if (!next[from]) next[from] = [];
      next[from] = [...next[from], { sender: from, text, timestamp: timestamp || Date.now() }];
      return next;
    });
  }, []);

  // Обрабатываем входящие сообщения из глобального хранилища.
  // Глобальный слушатель в App.jsx накапливает сообщения даже когда модалка закрыта.
  // Этот эффект срабатывает при открытии модалки и при каждом новом входящем сообщении.
  useEffect(() => {
    if (!isOpen) return;
    if (userState.incomingPersonalMessages.length === 0) return;
    const incoming = userState.consumeIncomingPersonalMessages();
    incoming.forEach(data => handleReceiveMessage(data));
  }, [isOpen, userState.incomingPersonalMessages.length, handleReceiveMessage]);

  // Загружаем историю при выборе контакта
  useEffect(() => {
    if (!selectedUser) return;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/users/messages/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (Array.isArray(response.data)) {
          const myId = userState.user?.id;
          const mapped = response.data.map(m => ({
            sender: m.from_user_id === myId ? myId : m.from_user_id,
            text: m.message,
            timestamp: m.timestamp
          }));

          setConversations(prev => ({
            ...prev,
            [selectedUser.id]: mapped
          }));
        }
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [selectedUser]);

  useEffect(() => {
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
      const response = await axios.get(
        `${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (Array.isArray(response.data)) {
        const filtered = response.data.filter(
          user => user.id !== userState.user?.id && user.is_active !== false
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addUserToContacts = (user) => {
    setContacts(prev => {
      if (prev.some(c => c.id === user.id)) return prev;
      const updated = [...prev, user];
      localStorage.setItem(getContactsKey(), JSON.stringify(updated));
      return updated;
    });

    setSelectedUser(user);
    setIsSearching(false);
    setSearchQuery('');
  };

  // Отправка через HTTP API и WebSocket (Issue #2) — мгновенная доставка
  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim() || loading) return;

    const trimmed = message.trim();
    const timestamp = Date.now();
    const myId = userState.user?.id || 'me';

    // Оптимистично добавляем в UI
    setConversations(prev => {
      const next = { ...prev };
      if (!next[selectedUser.id]) next[selectedUser.id] = [];
      next[selectedUser.id] = [...next[selectedUser.id], { sender: myId, text: trimmed, timestamp }];
      return next;
    });
    setMessage('');

    try {
      // Отправляем через WebSocket для мгновенной доставки
      WebSocketService.sendPersonalMessage(selectedUser.id, trimmed, timestamp);
      
      // Дублируем через HTTP API для надежности и сохранения в БД
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/users/messages`,
        { toUserId: selectedUser.id, message: trimmed, timestamp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Откатываем оптимистичное обновление при ошибке
      setConversations(prev => {
        const next = { ...prev };
        if (next[selectedUser.id]) {
          next[selectedUser.id] = next[selectedUser.id].filter(
            m => !(m.sender === myId && m.timestamp === timestamp && m.text === trimmed)
          );
        }
        return next;
      });
      setMessage(trimmed);
    }
  };

  if (!isOpen) return null;

  const mobileShowChat = isMobileView && !!selectedUser;
  const currentMessages = selectedUser ? (conversations[selectedUser.id] || []) : [];

  return (
    <div
      className={`room-interface-overlay${isMobileView ? ' pm-overlay-mobile' : ''}`}
      onClick={onClose}
      data-nosnippet
    >
      <div
        className={`room-interface personal-messages-modal${mobileShowChat ? ' mobile-chat-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobileView ? (
          <div className="pm-mobile-header">
            {mobileShowChat ? (
              <button className="back-to-contacts" onClick={() => setSelectedUser(null)}>←</button>
            ) : (
              <span className="pm-mobile-title">Личные сообщения</span>
            )}
            {mobileShowChat && <span className="pm-mobile-title">{selectedUser.username}</span>}
            <button className="pm-close-btn" onClick={onClose}>×</button>
          </div>
        ) : (
          <button className="room-close-btn" onClick={onClose}>×</button>
        )}

        <div className={`personal-messages-container${mobileShowChat ? ' mobile-chat-only' : ''}${selectedUser ? ' has-selected' : ''}`}>
          {!mobileShowChat && (
            <div className="sidebar active">
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
                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                  {loading ? '...' : '🔍'}
                </button>
              </div>

              {isSearching ? (
                <div className="search-results">
                  <div className="section-header">
                    <h3 className="section-title">Результаты поиска</h3>
                    <button className="back-btn" onClick={() => { setIsSearching(false); setSearchQuery(''); }}>
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
                        <li key={user.id} className="user-item" onClick={() => addUserToContacts(user)}>
                          <div className="user-avatar">
                            {user.avatar_url
                              ? <img src={user.avatar_url} alt={user.username} />
                              : <span>{user.username.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className="user-info">
                            <span className="user-name">{user.username}</span>
                            <span className="user-status">{user.is_online ? 'В сети' : 'Не в сети'}</span>
                          </div>
                          <button className="add-user-btn">Добавить</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="contacts">
                  <h3 className="contacts-title">Контакты</h3>
                  {contacts.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">👥</span>
                      <p>Пока нет контактов</p>
                      <p className="empty-hint">Найдите пользователей, чтобы начать общение</p>
                    </div>
                  ) : (
                    <ul className="users-list contacts-list">
                      {contacts.map(user => {
                        const last = (conversations[user.id] || []).slice(-1)[0];
                        return (
                          <li
                            key={user.id}
                            className={`user-item${selectedUser?.id === user.id ? ' selected' : ''}`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="user-avatar">
                              {user.avatar_url
                                ? <img src={user.avatar_url} alt={user.username} />
                                : <span>{user.username.charAt(0).toUpperCase()}</span>}
                            </div>
                            <div className="user-info">
                              <span className="user-name">{user.username}</span>
                              {last && (
                                <span className="last-message">
                                  {last.text.length > 20 ? `${last.text.substring(0, 20)}...` : last.text}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={`chat-area${mobileShowChat ? ' fullscreen' : ''}`}>
            {selectedUser ? (
              <>
                {!isMobileView && (
                  <div className="chat-header">
                    <div className="user-avatar">
                      {selectedUser.avatar_url
                        ? <img src={selectedUser.avatar_url} alt={selectedUser.username} />
                        : <span>{selectedUser.username.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="user-info">
                      <h3>{selectedUser.username}</h3>
                      <span className="user-status">{selectedUser.is_online ? 'В сети' : 'Не в сети'}</span>
                    </div>
                  </div>
                )}

                <div className="messages-list">
                  {historyLoading ? (
                    <div className="empty-state"><p>Загрузка истории...</p></div>
                  ) : currentMessages.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">💬</span>
                      <p>Пока нет сообщений</p>
                      <p className="empty-hint">Начните разговор</p>
                    </div>
                  ) : (
                    currentMessages.map((msg, index) => {
                      const isSentByMe = msg.sender === userState.user?.id || msg.sender === 'me';
                      // Проверяем валидность timestamp и создаем объект Date
                      const timestamp = typeof msg.timestamp === 'number' ? msg.timestamp : parseInt(msg.timestamp);
                      const messageDate = !isNaN(timestamp) ? new Date(timestamp) : new Date();
                      
                      // Форматируем время с проверкой на валидность даты
                      const formattedTime = messageDate instanceof Date && !isNaN(messageDate) 
                        ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '00:00';
                      
                      return (
                        <div key={index} className={`message ${isSentByMe ? 'sent' : 'received'}`}>
                          <div className="message-content">
                            <p>{msg.text}</p>
                            <span className="message-time">
                              {formattedTime}
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
