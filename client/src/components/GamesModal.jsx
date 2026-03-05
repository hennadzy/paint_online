import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const GamesModal = observer(() => {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  if (!canvasState.showGamesModal) return null;

  return ReactDOM.createPortal(
    <div className="room-interface-overlay fullscreen" onClick={() => canvasState.setShowGamesModal(false)}>
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
                Мы готовим для вас увлекательные игровые режимы.
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
    </div>,
    document.body // <-- ВАЖНО: рендерим в body
  );
});

export default GamesModal;
