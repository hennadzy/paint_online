import React from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const InactiveModal = observer(() => {
  const navigate = useNavigate();

  if (!canvasState.showInactiveModal) return null;

  const handleOk = () => {
    canvasState.setShowInactiveModal(false);
    canvasState.disconnect(true);
    navigate('/');
  };

  return (
    <div className="room-interface-overlay input-dialog-overlay" data-nosnippet>
      <div className="room-interface input-dialog">
        <div className="room-card username-form">
          <div className="room-card-header">
            <h2>Вы были исключены</h2>
            <p>Вы были исключены из комнаты за неактивность</p>
          </div>
          <div className="room-card-body">
            <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Вы отсутствовали более 10 минут и были автоматически отключены от комнаты.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button
                className="room-btn room-btn-primary"
                onClick={handleOk}
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InactiveModal;
