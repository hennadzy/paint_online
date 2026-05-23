import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import userState from '../store/userState';
import { API_URL } from '../store/canvasState';
import axios from 'axios';
import '../styles/personal-messages.scss';

const getContactsKey = () => `personalContacts_${userState.user?.id || 'guest'}`;

const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') return '';
  try {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  } catch (_) {
    return text;
  }
};

const PersonalMessagesModal = observer(({ isOpen, onClose, initialUser }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState({});
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const markedDeliveredRef = useRef({});
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedContacts = localStorage.getItem(getContactsKey());
      if (savedContacts) {
        const parsed = JSON.parse(savedContacts);
        setContacts(Array.isArray(parsed) ? parsed : []);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, [isOpen]);

  const refreshContacts = useCallback(async () => {
    if (!isOpen) return;

    const token = localStorage.getItem('token');
    const myId = userState.user?.id;
    if (!token || !myId) return;

    setContactsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(response.data)) {
        const nextContacts = response.data.slice(0, 200).map(c => ({
          ...c,
          undelivered_received_count:
            typeof c.undelivered_received_count === 'number'
              ? c.undelivered_received_count
              : 0,
          undelivered_sent_count:
            typeof c.undelivered_sent_count === 'number' ? c.undelivered_sent_count : 0
        }));

        setContacts(nextContacts);

        try {
          localStorage.setItem(getContactsKey(), JSON.stringify(nextContacts));
        } catch (e) {
          console.warn('personalContacts localStorage write failed:', e);
        }
      }
    } catch (error) {
      console.error('Error loading contacts from server:', error);
      try {
        const savedContacts = localStorage.getItem(getContactsKey());
        if (savedContacts) {
          const parsed = JSON.parse(savedContacts);
          if (Array.isArray(parsed)) {
            setContacts(parsed);
          }
        }
      } catch (_) {}
    } finally {
      setContactsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      refreshContacts();
    }
  }, [isOpen, refreshContacts]);


  useEffect(() => {
    if (!isOpen) return;
    markedDeliveredRef.current = {};
    markedDeliveredRef.current['_autoSelected'] = false;

    if (initialUser?.id) {
      setSelectedUser(initialUser);
      isModalOpenRef.current = true;
      return;
    }

    if (!selectedUser && contacts.length > 0 && !markedDeliveredRef.current['_autoSelected']) {
      setSelectedUser(contacts[0]);
      markedDeliveredRef.current['_autoSelected'] = true;
      isModalOpenRef.current = true;
    }
  }, [isOpen, initialUser, contacts, refreshContacts]);

  useEffect(() => {
    if (!isOpen) {
      isModalOpenRef.current = false;
      markedDeliveredRef.current = {};
      markedDeliveredRef.current['_autoSelected'] = false;
      setSelectedUser(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedUser?.id) return;
    if (markedDeliveredRef.current[selectedUser.id]) return;

    markedDeliveredRef.current[selectedUser.id] = true;
    markedDeliveredRef.current['_autoSelected'] = false;
    markDeliveredForContact(selectedUser.id, false);
  }, [isOpen, selectedUser]);

  useEffect(() => {
    if (!isOpen || !selectedUser?.id) return;
    setContacts(prev => {
      if (prev.some(c => c.id === selectedUser.id)) return prev;

      const updated = [
        ...prev,
        {
          ...selectedUser,
          undelivered_received_count: 0,
          undelivered_sent_count: typeof selectedUser.undelivered_sent_count === 'number' ? selectedUser.undelivered_sent_count : 0
        }
      ];
      localStorage.setItem(getContactsKey(), JSON.stringify(updated));
      return updated;
    });
  }, [isOpen, selectedUser]);

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

  const handleReceiveMessage = useCallback((data) => {
    const { from, fromUsername, message: text, timestamp } = data;

    setContacts(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const idx = next.findIndex(c => String(c.id) === String(from));

      const isSameChat = selectedUser?.id && String(selectedUser.id) === String(from);

      if (idx === -1) {
        const undeliveredReceived = isSameChat ? 0 : 1;
        next.push({
          id: from,
          username: fromUsername || from,
          is_online: true,
          undelivered_received_count: undeliveredReceived,
          undelivered_sent_count: 0,
          last_timestamp: timestamp,
          last_message: text
        });
      } else {
        const currReceived = typeof next[idx].undelivered_received_count === 'number' ? next[idx].undelivered_received_count : 0;
        const currSent = typeof next[idx].undelivered_sent_count === 'number' ? next[idx].undelivered_sent_count : 0;

        const nextReceived = isSameChat ? 0 : currReceived + 1;

        next[idx] = {
          ...next[idx],
          is_online: true,
          undelivered_received_count: nextReceived,
          undelivered_sent_count: currSent,
          last_timestamp: timestamp,
          last_message: text
        };
      }

      try {
        localStorage.setItem(getContactsKey(), JSON.stringify(next));
      } catch (_) {}
      return sortContacts(next);
    });

    setConversations(prev => {
      const next = { ...prev };
      if (!next[from]) next[from] = [];
      next[from] = [...next[from], { sender: from, text, timestamp: timestamp || Date.now() }];
      return next;
    });
  }, [selectedUser?.id]);

  const clearNotifications = () => {
    userState.incomingPersonalMessages = [];
  };

  const sortContacts = (list) => {
    const safe = Array.isArray(list) ? list : [];
    return safe
      .slice()
      .sort((a, b) => {
        const ua = typeof a.undelivered_received_count === 'number' ? a.undelivered_received_count : 0;
        const ub = typeof b.undelivered_received_count === 'number' ? b.undelivered_received_count : 0;

        if ((ub > 0) !== (ua > 0)) return ub > 0 ? -1 : 1;
        if (ub !== ua) return ub - ua;

        const ta = typeof a.last_timestamp === 'number' ? a.last_timestamp : -1;
        const tb = typeof b.last_timestamp === 'number' ? b.last_timestamp : -1;
        if (tb !== ta) return tb - ta;

        return String(a.username || '').localeCompare(String(b.username || ''));
      });
  };

  useEffect(() => {
    if (!isOpen || !selectedUser) return;
    if (userState.incomingPersonalMessages.length === 0) return;
    const incoming = userState.consumeIncomingPersonalMessages();
    incoming.forEach(data => handleReceiveMessage(data));
    clearNotifications();
  }, [isOpen, selectedUser, userState.incomingPersonalMessages.length, handleReceiveMessage]);

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
      const updated = [
        ...prev,
        {
          ...user,
          undelivered_received_count: 0,
          undelivered_sent_count: 0
        }
      ];
      localStorage.setItem(getContactsKey(), JSON.stringify(updated));
      return updated;
    });

    setSelectedUser(user);
    setIsSearching(false);
    setSearchQuery('');
  };

  const markDeliveredForContact = async (contactId, refreshFromServer = true) => {
    const token = localStorage.getItem('token');
    if (!token || !contactId) return;

    if (refreshFromServer) {
      try {
        await axios.post(
          `${API_URL}/api/users/messages/mark-delivered/${encodeURIComponent(contactId)}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        console.warn('mark-delivered failed:', e);
      }
    }

    setContacts(prev => {
      const next = Array.isArray(prev)
        ? prev.map(c => {
            if (String(c.id) !== String(contactId)) return c;
            return {
              ...c,
              undelivered_received_count: 0
            };
          })
        : [];
      try {
        localStorage.setItem(getContactsKey(), JSON.stringify(next));
      } catch (_) {}
      return sortContacts(next);
    });
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim() || loading) return;

    const trimmed = message.trim();
    const timestamp = Date.now();
    const myId = userState.user?.id || 'me';

    setConversations(prev => {
      const next = { ...prev };
      if (!next[selectedUser.id]) next[selectedUser.id] = [];
      next[selectedUser.id] = [...next[selectedUser.id], { sender: myId, text: trimmed, timestamp }];
      return next;
    });
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/users/messages`,
        { toUserId: selectedUser.id, message: trimmed, timestamp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setContacts(prev => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex(c => String(c.id) === String(selectedUser.id));
        if (idx !== -1) {
          const currSent = typeof next[idx].undelivered_sent_count === 'number'
            ? next[idx].undelivered_sent_count
            : 0;
          next[idx] = {
            ...next[idx],
            undelivered_sent_count: currSent + 1,
            last_timestamp: timestamp,
            last_message: trimmed
          };
        } else {
          next.push({
            ...selectedUser,
            undelivered_received_count: 0,
            undelivered_sent_count: 1,
            last_timestamp: timestamp,
            last_message: trimmed
          });
        }
        try {
          localStorage.setItem(getContactsKey(), JSON.stringify(next));
        } catch (_) {}
        return sortContacts(next);
      });

      axios.post(
        `${API_URL}/api/users/messages/mark-read/${encodeURIComponent(selectedUser.id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
    } catch (error) {
      console.error('Error sending message:', error);
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

  const sortedContacts = sortContacts(contacts);

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
        <div className="pm-header">
          {isMobileView ? (
            <>
              {mobileShowChat ? (
                <button className="back-to-contacts" onClick={() => setSelectedUser(null)}>←</button>
              ) : (
                <span className="pm-mobile-title">Личные сообщения</span>
              )}
              {mobileShowChat && <span className="pm-mobile-title">{selectedUser.username}</span>}
            </>
          ) : (
            <span className="pm-title">Личные сообщения</span>
          )}
          <button className="pm-close-btn" onClick={onClose}>×</button>
        </div>

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
                  {sortedContacts.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">👥</span>
                      <p>Пока нет контактов</p>
                      <p className="empty-hint">Найдите пользователей, чтобы начать общение</p>
                    </div>
                  ) : (
                    <ul className="users-list contacts-list">
                      {sortedContacts.map(user => {
                            const last = (conversations[user.id] || []).slice(-1)[0];
                            const unreadForUs = typeof user.undelivered_received_count === 'number' ? user.undelivered_received_count : 0;
                            const unreadForThem = typeof user.undelivered_sent_count === 'number' ? user.undelivered_sent_count : 0;

                        return (
                          <li
                            key={user.id}
                            className={`user-item${selectedUser?.id === user.id ? ' selected' : ''}`}
                            onClick={() => {
                              setSelectedUser(user);
                            }}
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
                            {unreadForUs > 0 && (
                              <span className="pm-unread-dot pm-unread-dot--red" title={`Нам непрочитано: ${unreadForUs}`} />
                            )}
                            {!unreadForUs && unreadForThem > 0 && (
                              <span className="pm-unread-dot pm-unread-dot--gray" title={`Собеседнику непрочитано: ${unreadForThem}`} />
                            )}
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

                <>
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
                        const timestamp = typeof msg.timestamp === 'number' ? msg.timestamp : parseInt(msg.timestamp);
                        const messageDate = !isNaN(timestamp) ? new Date(timestamp) : new Date();

                        const formattedTime = messageDate instanceof Date && !isNaN(messageDate)
                          ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '00:00';

                        return (
                          <div key={index} className={`message ${isSentByMe ? 'sent' : 'received'}`}>
                            <div className="message-content">
                              <p>{decodeHtmlEntities(msg.text)}</p>
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
