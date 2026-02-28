import React from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const FeedbackModal = observer(() => {
  if (!canvasState.showFeedbackModal) return null;

  return (
    <div className="room-interface-overlay fullscreen" onClick={() => canvasState.setShowFeedbackModal(false)}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowFeedbackModal(false)}>×</button>

        <div className="room-card about-content fullscreen">
          <div className="about-section">
            <h2>Обратная связь</h2>
            <p>
              На сайте проводятся технические работы, поэтому возможны временные сбои в работе сервиса.
              Мы делаем всё возможное, чтобы улучшить ваше взаимодействие с платформой и добавить новые функции. Приносим извинения за возможные неудобства.
            </p>
            <p>
              Если у вас возникли вопросы или вы хотите сообщить о проблеме, напишите нам:
            </p>
            <p>
              📧 <a href="mailto:admin@paint-art.ru" style={{ color: '#ffcc00' }}>admin@paint-art.ru</a>
            </p>
            <p>
              Спасибо за понимание! ❤️
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button
              className="room-btn room-btn-primary"
              onClick={() => canvasState.setShowFeedbackModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FeedbackModal;
