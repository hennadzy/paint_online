import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../store/canvasState';
import axios from 'axios';

const axiosInstance = axios.create({ timeout: 10000 });
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

const RoomActionsDropdown = ({ room, isCreator, onDeleted, onUpdated, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [privatePassword, setPrivatePassword] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isCreator) return null;

  const roomLink = typeof window !== 'undefined' ? `${window.location.origin}/${room.id}` : '';

  const handleInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: room.name,
          text: `Присоединяйся к комнате "${room.name}"`,
          url: roomLink
        });
      } else {
        await navigator.clipboard.writeText(roomLink);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(roomLink);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      }
    }
    setOpen(false);
  };

  const handleMakePublic = async () => {
    setLoading(true);
    try {
      await axiosInstance.patch(`${API_URL}/rooms/${room.id}`, { isPublic: true });
      onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleMakePrivate = (e) => {
    e?.stopPropagation();
    setPasswordPrompt({ action: 'private' });
  };

  const handleDelete = (e) => {
    e?.stopPropagation();
    if (window.confirm(`Удалить комнату "${room.name}"? Это действие нельзя отменить.`)) {
      setLoading(true);
      axiosInstance.delete(`${API_URL}/rooms/${room.id}`)
        .then(() => {
          onDeleted?.();
          navigate('/');
        })
        .catch(console.error)
        .finally(() => { setLoading(false); setOpen(false); });
    } else {
      setOpen(false);
    }
  };

  const submitPassword = async () => {
    if (!privatePassword.trim()) return;
    setLoading(true);
    try {
      await axiosInstance.patch(`${API_URL}/rooms/${room.id}`, { isPublic: false, password: privatePassword.trim() });
      setPasswordPrompt(null);
      setPrivatePassword('');
      onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="room-actions-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`room-actions-trigger ${compact ? 'compact' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        aria-label="Действия с комнатой"
        disabled={loading}
      >
        ⋮
      </button>
      {open && !passwordPrompt && (
        <div className="room-actions-menu">
          <button type="button" onClick={handleInvite}>
            {inviteCopied ? '✓ Скопировано!' : '📤 Пригласить'}
          </button>
          {room.isPublic ? (
            <button type="button" onClick={handleMakePrivate} disabled={loading}>
              🔒 Сделать приватной
            </button>
          ) : (
            <button type="button" onClick={handleMakePublic} disabled={loading}>
              🌍 Сделать публичной
            </button>
          )}
          <button type="button" className="room-actions-delete" onClick={handleDelete} disabled={loading}>
            🗑 Удалить комнату
          </button>
        </div>
      )}
      {passwordPrompt && (
        <div className="room-actions-password-prompt">
          <p>Введите пароль для приватной комнаты:</p>
          <input
            type="password"
            placeholder="Пароль"
            value={privatePassword}
            onChange={(e) => setPrivatePassword(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPassword();
              if (e.key === 'Escape') { setPasswordPrompt(null); setPrivatePassword(''); }
            }}
          />
          <div className="room-actions-prompt-btns">
            <button type="button" onClick={submitPassword}>OK</button>
            <button type="button" onClick={() => { setPasswordPrompt(null); setPrivatePassword(''); }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomActionsDropdown;
