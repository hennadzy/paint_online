import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const GamesModal = observer(() => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  if (!canvasState.showGamesModal) return null;

  const gamesList = [
    { id: 'coloring', name: 'Раскраски', icon: '🎨', available: true },
    { id: 'repeat', name: 'Повтори рисунок', icon: '🔄', available: false },
    { id: 'continue', name: 'Продолжи рисунок', icon: '➡️', available: false },
    { id: 'oneforall', name: 'Один на всех', icon: '👥', available: false },
    { id: 'relay', name: 'Эстафета', icon: '🏃', available: false },
    { id: 'drawfaster', name: 'Рисуй быстрее', icon: '⏱️', available: false }
  ];

  const handleGameClick = (game) => {
    if (game.id === 'coloring') {
      canvasState.setShowGamesModal(false);
      navigate('/coloring');
    }

  };

  return ReactDOM.createPortal(
    <div className="room-interface-overlay fullscreen" onClick={() => canvasState.setShowGamesModal(false)}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowGamesModal(false)}>×</button>

        <div className="room-welcome">
          <h1>🎮 Игровые режимы</h1>
          <p>Развлекайтесь и рисуйте вместе!</p>
        </div>

        <div className="room-card about-content fullscreen">
          <div className="game-modes-list">
            {gamesList.map(game => (
              <button
                key={game.id}
                className={`room-btn room-btn-primary game-mode-btn ${!game.available ? 'game-mode-btn--soon' : ''}`}
                onClick={() => handleGameClick(game)}
                style={{
                  margin: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: 'calc(100% - 20px)',
                  maxWidth: '400px',
                  opacity: game.available ? 1 : 0.6,
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '24px' }}>{game.icon}</span>
                <span>{game.name}</span>
                {!game.available && (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    fontSize: '11px',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    скоро
                  </span>
                )}
              </button>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '20px' }}>
              <button
                className="room-btn room-btn-secondary"
                onClick={() => canvasState.setShowGamesModal(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default GamesModal;
