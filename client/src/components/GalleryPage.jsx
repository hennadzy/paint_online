import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import userState from '../store/userState';
import { API_URL } from '../store/canvasState';
import '../styles/gallery.scss';

const HeartIcon = ({ filled }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const GalleryPage = observer(() => {
  const navigate = useNavigate();
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likingId, setLikingId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchDrawings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/gallery`, { headers });
      setDrawings(response.data.drawings || []);
    } catch (err) {
      setError('Ошибка загрузки галереи');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  const handleLike = async (drawingId) => {
    if (!userState.isAuthenticated) return;
    if (likingId === drawingId) return;

    setLikingId(drawingId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/gallery/${drawingId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { liked, likesCount } = response.data;
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, user_liked: liked, likes_count: likesCount }
            : d
        )
      );
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikingId(null);
    }
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(Number(ts));
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleImageClick = (drawing) => {
    setSelectedImage(drawing);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedImage(null);
    }
  };

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <button
          className="gallery-back-btn"
          onClick={() => navigate('/')}
          aria-label="На главную"
        >
          ← На главную
        </button>
        <h1 className="gallery-title">🎨 Галерея работ</h1>
        <div className="gallery-header-spacer" />
      </header>

      <main className="gallery-main">
        {loading && (
          <div className="gallery-loading">
            <div className="gallery-spinner" />
            <p>Загрузка галереи...</p>
          </div>
        )}

        {!loading && error && (
          <div className="gallery-error">
            <p>{error}</p>
            <button className="gallery-retry-btn" onClick={fetchDrawings}>
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && drawings.length === 0 && (
          <div className="gallery-empty">
            <div className="gallery-empty-icon">🖼️</div>
            <h2>Галерея пуста</h2>
            <p>Будьте первым, кто добавит свою работу.</p>
            <p className="gallery-empty-hint">
              Добавлять рисунки в галерею могут только авторизованные пользователи.
            </p>
            {!userState.isAuthenticated && (
              <button
                className="gallery-auth-btn"
                onClick={() => navigate('/login')}
              >
                Войти
              </button>
            )}
          </div>
        )}

        {!loading && !error && drawings.length > 0 && (
          <div className="gallery-feed">
            {drawings.map(drawing => (
              <div 
                key={drawing.id} 
                className="gallery-card"
                onClick={() => handleImageClick(drawing)}
              >
                <div className="gallery-card__image-wrap">
                  {imageErrors[drawing.id] ? (
                    <div className="gallery-card__image-fallback">
                      <span>🖼️</span>
                    </div>
                  ) : (
                    <img
                      src={`${API_URL}/api/gallery/image/${drawing.id}`}
                      alt={drawing.title}
                      className="gallery-card__image"
                      loading="lazy"
                      onError={() => handleImageError(drawing.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(drawing);
                      }}
                    />
                  )}
                </div>
                <div className="gallery-card__info">
                  <h3 className="gallery-card__title">{drawing.title}</h3>
                  <p className="gallery-card__author">✏️ {drawing.author_name}</p>
                  <p className="gallery-card__date">{formatDate(drawing.approved_at || drawing.created_at)}</p>
                  <div className="gallery-card__footer">
                    <button
                      className={`gallery-like-btn ${drawing.user_liked ? 'liked' : ''} ${!userState.isAuthenticated ? 'disabled' : ''}`}
                      onClick={() => userState.isAuthenticated && handleLike(drawing.id)}
                      disabled={likingId === drawing.id || !userState.isAuthenticated}
                      title={userState.isAuthenticated ? (drawing.user_liked ? 'Убрать лайк' : 'Поставить лайк') : 'Войдите, чтобы ставить лайки'}
                    >
                      <HeartIcon filled={drawing.user_liked} />
                      <span className="gallery-like-count">{drawing.likes_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div className="gallery-image-modal" onClick={handleOverlayClick}>
            <div className="gallery-image-modal__content">
              <button 
                className="gallery-image-modal__close"
                onClick={handleCloseModal}
                aria-label="Закрыть"
              >
                ×
              </button>
              <img 
                src={`${API_URL}/api/gallery/image/${selectedImage.id}`}
                alt={selectedImage.title}
                className="gallery-image-modal__image"
              />
              <div className="gallery-image-modal__info">
                <h3>{selectedImage.title}</h3>
                <p>✏️ {selectedImage.author_name}</p>
                <p>{formatDate(selectedImage.approved_at || selectedImage.created_at)}</p>
                <div className="gallery-image-modal__likes">
                  <span>❤️ {selectedImage.likes_count}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
});

export default GalleryPage;
