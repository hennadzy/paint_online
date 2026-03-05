import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

// Стили вынесены за пределы компонента, чтобы не нарушать правила хуков
const gamesModalStyles = `
  .games-modal-fix {
    z-index: 9999999 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.98) !important;
    backdrop-filter: blur(12px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .games-modal-fix .room-interface {
    max-height: 90vh !important;
    overflow-y: auto !important;
    width: 90% !important;
    max-width: 600px !important;
    margin: 0 auto !important;
  }
  
  @media (max-width: 768px) {
    .games-modal-fix {
      padding: env(safe-area-inset-top, 20px) 15px env(safe-area-inset-bottom, 20px) 15px !important;
      align-items: flex-start !important;
      overflow-y: auto !important;
    }
    
    .games-modal-fix .room-interface {
      width: 100% !important;
      max-width: none !important;
      margin-top: env(safe-area-inset-top, 20px) !important;
    }
  }
`;

const GamesModal = observer(() => {
  useEffect(() => {
    // Добавляем стили при монтировании
    const styleElement = document.createElement('style');
    styleElement.textContent = gamesModalStyles;
    styleElement.className = 'games-modal-style';
    document.head.appendChild(styleElement);

    // Блокируем скролл body
    document.body.classList.add('modal-open');

    // Убираем стили и разблокируем скролл при размонтировании
    return () => {
      const existingStyle = document.querySelector('.games-modal-style');
      if (existingStyle) {
        existingStyle.remove();
      }
      document.body.classList.remove('modal-open');
    };
  }, []); // Пустой массив зависимостей - эффект выполняется только при монтировании/размонтировании

  if (!canvasState.showGamesModal) return null;

  return (
    <div className="room-interface-overlay fullscreen games-modal-fix" onClick={() => canvasState.setShowGamesModal(false)}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowGamesModal(false)}>×</button>

        <div className="room-welcome">
          <h1>🎮 Игровые режимы</h1>
          <p>Развлекайтесь и рисуйте вместе!</p>
        </div>

        <div className="room-card about-content fullscreen">
          <div className="about-section">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h2 style={{ color: '#ffcc00', marginBottom: '15px', fontSize: '28px' }}>Раздел в разработке</h2>
              <p style={{ color: '#fff', fontSize: '18px', lineHeight: '1.6', marginBottom: '20px' }}>
                Мы готовим для вас увлекательные игровые режимы, где можно будет
                рисовать вместе, соревноваться и отгадывать рисунки!
              </p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '15px' }}>
                Следите за обновлениями — скоро здесь будет весело! ✨
              </p>
              <p style={{ color: '#ff6699', fontSize: '18px', fontWeight: 'bold' }}>
                Приносим извинения за временные неудобства ❤️
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '20px' }}>
            <button 
              className="room-btn room-btn-primary" 
              onClick={() => canvasState.setShowGamesModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GamesModal;
