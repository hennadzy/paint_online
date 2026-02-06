import React from 'react';
import { observer } from 'mobx-react-lite';
import '../styles/modal.scss';

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
    <div 
      data-nosnippet
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem'
      }}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 1000001,
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333', fontWeight: '600' }}>Восстановить работу?</h2>
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#555', fontSize: '1rem', lineHeight: '1.5' }}>
            Найдена несохранённая работа от {formattedTime}
          </p>
          <p style={{ color: '#777', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
            Вы хотите продолжить с того места, где остановились?
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={onDiscard}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #ddd',
              background: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              minWidth: '140px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f5f5f5';
              e.target.style.borderColor = '#ccc';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#ddd';
            }}
          >
            Начать заново
          </button>
          <button 
            onClick={onRestore}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: '#007bff',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              minWidth: '140px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#007bff';
            }}
          >
            Восстановить
          </button>
        </div>
      </div>
    </div>
  );
});

export default RestoreDialog;
