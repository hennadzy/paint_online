import React from 'react';
import { observer } from 'mobx-react-lite';
import '../styles/modal.scss';

const RestoreDialog = observer(({ show, timestamp, onRestore, onDiscard }) => {
  if (!show) return null;
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    if (onDiscard) onDiscard();
    return null;
  }

  const formatTime = (ts) => {
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const timeStr = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) {
      return `сегодня в ${timeStr}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `вчера в ${timeStr}`;
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" data-nosnippet>
      <div className="modal restore-dialog">
        <div className="modal-header">
          <h2>Восстановить работу?</h2>
        </div>
        <div className="modal-body">
          <p>Найдена несохранённая работа от {formatTime(timestamp)}</p>
          <p className="restore-hint">Вы хотите продолжить с того места, где остановились?</p>
        </div>
        <div className="modal-footer">
          <button 
            className="room-btn room-btn-primary" 
            onClick={onRestore}
          >
            Восстановить
          </button>
          <button 
            className="room-btn room-btn-ghost" 
            onClick={onDiscard}
          >
            Начать заново
          </button>
        </div>
      </div>
    </div>
  );
});

export default RestoreDialog;
