import React from 'react';
import { observer } from 'mobx-react-lite';
import '../styles/modal.scss';

const RestoreDialog = observer(({ show, timestamp, onRestore, onDiscard }) => {
  console.log('🔴 RestoreDialog render:', { show, timestamp, type: typeof timestamp });
  
  if (!show) {
    console.log('🔴 RestoreDialog: show=false, returning null');
    return null;
  }
  
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    console.log('🔴 RestoreDialog: invalid timestamp, calling onDiscard');
    if (onDiscard) onDiscard();
    return null;
  }
  
  console.log('🔴 RestoreDialog: RENDERING DIALOG!');
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
    <div 
      className="modal-overlay" 
      data-nosnippet
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999
      }}
    >
      <div 
        className="modal restore-dialog"
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="modal-header">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Восстановить работу?</h2>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 0.75rem 0' }}>Найдена несохранённая работа от {formatTime(timestamp)}</p>
          <p className="restore-hint" style={{ color: '#777', fontSize: '0.9rem' }}>Вы хотите продолжить с того места, где остановились?</p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button 
            onClick={onDiscard}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #ccc',
              background: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
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
              fontSize: '1rem'
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
