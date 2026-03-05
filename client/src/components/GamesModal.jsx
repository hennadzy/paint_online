import React from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

// Критический CSS прямо в компоненте
const modalStyles = `
  .games-modal-override {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    background: rgba(0, 0, 0, 0.95) !important;
    backdrop-filter: blur(12px) !important;
    z-index: 9999999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow-y: auto !important;
  }
  
  .games-modal-content {
    position: relative !important;
    width: 90% !important;
    max-width: 600px !important;
    margin: 20px !important;
    z-index: 10000000 !important;
  }
`;

const GamesModal = observer(() => {
  if (!canvasState.showGamesModal) return null;

  return (
    <>
      <style>{modalStyles}</style>
      <div 
        className="games-modal-override" 
        onClick={() => canvasState.setShowGamesModal(false)}
      >
        <div 
          className="games-modal-content" 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="room-close-btn" 
            onClick={() => canvasState.setShowGamesModal(false)}
            style={{ position: 'absolute', top: '12px', right: '24px', zIndex: 10000001 }}
          >
            ×
          </button>

          <div className="room-card about-content">
            <div className="about-section">
              <h2>🎮 Игровые режимы</h2>
              
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎨</span>
                <h3 style={{ color: '#ffcc00', marginBottom: '15px' }}>Раздел в разработке</h3>
                <p style={{ color: '#fff', fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
                  Мы готовим для вас увлекательные игровые режимы, где можно будет<br/>
                  рисовать вместе, соревноваться и отгадывать рисунки!
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                  Следите за обновлениями — скоро здесь будет весело! ✨
                </p>
                <p style={{ color: '#ff6699', marginTop: '20px', fontSize: '15px' }}>
                  Приносим извинения за временные неудобства ❤️
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
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
    </>
  );
});

export default GamesModal;
