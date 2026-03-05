import React from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const GamesModal = observer(() => {
  if (!canvasState.showGamesModal) return null;

  return (
    <div className="room-interface-overlay fullscreen" onClick={() => canvasState.setShowGamesModal(false)}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowGamesModal(false)}>×</button>

        <div className="room-card about-content fullscreen">
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
  );
});

export default GamesModal;
