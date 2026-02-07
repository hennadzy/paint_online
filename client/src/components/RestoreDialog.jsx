import React from 'react';
import { observer } from 'mobx-react-lite';
import '../styles/room-interface.scss';

const RestoreDialog = observer(({ show, timestamp, onRestore, onDiscard }) => {
  if (!show) return null;
  
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    if (onDiscard) onDiscard();
    return null;
  }
  
  let formattedTime = 'неизвестно';
  try {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const timeStr = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) {
      formattedTime = `сегодня в ${timeStr}`;
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isYesterday) {
        formattedTime = `вчера в ${timeStr}`;
      } else {
        formattedTime = date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  } catch (error) {
    formattedTime = 'неизвестно';
  }
  
  return (
    <div className="room-interface-overlay input-dialog-overlay" data-nosnippet>
      <div className="room-interface input-dialog">
        <div className="room-card username-form">
          <div className="room-card-header">
            <h2>Восстановить работу?</h2>
            <p>Найдена несохранённая работа от {formattedTime}</p>
          </div>
          <div className="room-card-body">
            <p style={{ color: '#777', fontSize: '0.95rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Вы хотите продолжить с того места, где остановились?
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                className="room-btn room-btn-primary" 
                onClick={onRestore}
              >
                Восстановить
              </button>
              <button 
                className="room-btn room-btn-secondary" 
                onClick={onDiscard}
              >
                Начать заново
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RestoreDialog;
