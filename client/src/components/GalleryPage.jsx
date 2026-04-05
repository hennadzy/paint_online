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
  const [comments, setComments] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

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

  const fetchComments = async (drawingId) => {
    setCommentsLoading(prev => ({ ...prev, [drawingId]: true }));
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(
        `${API_URL}/api/gallery/${drawingId}/comments`,
        { headers }
      );
      setComments(prev => ({ ...prev, [drawingId]: response.data.comments || [] }));
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setCommentsLoading(prev => ({ ...prev, [drawingId]: false }));
    }
  };

  const toggleComments = async (drawingId, e) => {
    if (e) e.stopPropagation();

    // Сворачиваем все другие комментарии
    setExpandedComments(prev => {
      const newExpanded = {};
      Object.keys(prev).forEach(key => {
        if (key !== String(drawingId)) {
          newExpanded[key] = false;
        }
      });
      newExpanded[drawingId] = !prev[drawingId];
      return newExpanded;
    });

    // Если открываем комментарии и они еще не загружены
    if (!expandedComments[drawingId] && !comments[drawingId]) {
      await fetchComments(drawingId);
    }
  };

  const handleSubmitComment = async (drawingId, e) => {
    if (e) e.stopPropagation();
    if (!userState.isAuthenticated) {
      alert('Войдите, чтобы оставлять комментарии');
      return;
    }
    const commentText = newComment[drawingId]?.trim();
    if (!commentText) return;

    setSubmittingComment(prev => ({ ...prev, [drawingId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/gallery/${drawingId}/comments`,
        { comment: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => ({
        ...prev,
        [drawingId]: [...(prev[drawingId] || []), response.data.comment]
      }));
      setNewComment(prev => ({ ...prev, [drawingId]: '' }));

      // Обновляем количество комментариев в карточке
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, comments_count: (d.comments_count || 0) + 1 }
            : d
        )
      );
    } catch (err) {
      console.error('Submit comment error:', err);
      alert('Ошибка отправки комментария');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [drawingId]: false }));
    }
  };

  const handleEditComment = async (commentId, drawingId) => {
    if (!userState.isAuthenticated) return;

    setSubmittingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/gallery/comments/${commentId}`,
        { comment: editCommentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => ({
        ...prev,
        [drawingId]: prev[drawingId].map(c =>
          c.id === commentId ? response.data.comment : c
        )
      }));

      setEditingComment(null);
      setEditCommentText('');
    } catch (err) {
      console.error('Edit comment error:', err);
      alert(err.response?.data?.error || 'Ошибка редактирования комментария');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId, drawingId) => {
    if (!userState.isAuthenticated) return;
    if (!window.confirm('Удалить комментарий?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/gallery/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => ({
        ...prev,
        [drawingId]: prev[drawingId].filter(c => c.id !== commentId)
      }));

      // Обновляем количество комментариев в карточке
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, comments_count: Math.max(0, (d.comments_count || 1) - 1) }
            : d
        )
      );
    } catch (err) {
      console.error('Delete comment error:', err);
      alert(err.response?.data?.error || 'Ошибка удаления комментария');
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
                className={`gallery-card ${expandedComments[drawing.id] ? 'comments-expanded' : ''}`}
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
                      className={`gallery-comments-btn ${expandedComments[drawing.id] ? 'active' : ''}`}
                      onClick={(e) => toggleComments(drawing.id, e)}
                      title="Комментарии"
                    >
                      💬 Комментарии ({drawing.comments_count || 0})
                    </button>
                    <button
                      className={`gallery-like-btn ${drawing.user_liked ? 'liked' : ''} ${!userState.isAuthenticated ? 'disabled' : ''}`}
                      onClick={(e) => { e.stopPropagation(); userState.isAuthenticated && handleLike(drawing.id); }}
                      disabled={likingId === drawing.id || !userState.isAuthenticated}
                      title={userState.isAuthenticated ? (drawing.user_liked ? 'Убрать лайк' : 'Поставить лайк') : 'Войдите, чтобы ставить лайки'}
                    >
                      <HeartIcon filled={drawing.user_liked} />
                      <span className="gallery-like-count">{drawing.likes_count}</span>
                    </button>
                  </div>
                </div>

                {expandedComments[drawing.id] && (
                  <div className="gallery-card__comments" onClick={(e) => e.stopPropagation()}>
                    {commentsLoading[drawing.id] ? (
                      <div className="gallery-comments-loading">Загрузка комментариев...</div>
                    ) : (
                      <>
                        <div className="gallery-comments-list">
                          {comments[drawing.id] && comments[drawing.id].length > 0 ? (
                            comments[drawing.id].map(comment => {
                              const isCommentAuthor = comment.user_id === userState.user?.id;
                              const isAdmin = ['admin', 'superadmin'].includes(userState.user?.role);
                              const canEdit = isCommentAuthor || isAdmin;

                              return (
                                <div key={comment.id} className="gallery-comment">
                                  <div className="gallery-comment__header">
                                    <span className="gallery-comment__author">
                                      {comment.author_name}
                                    </span>
                                    <span className="gallery-comment__date">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  {editingComment === comment.id ? (
                                    <div className="gallery-comment__edit">
                                      <textarea
                                        className="gallery-comment__textarea"
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleEditComment(comment.id, drawing.id);
                                          }
                                        }}
                                        maxLength={500}
                                        autoFocus
                                      />
                                      <div className="gallery-comment__actions">
                                        <button
                                          className="gallery-comment__btn gallery-comment__btn--save"
                                          onClick={() => handleEditComment(comment.id, drawing.id)}
                                          disabled={submittingEdit || !editCommentText.trim()}
                                        >
                                          {submittingEdit ? '...' : 'Сохранить'}
                                        </button>
                                        <button
                                          className="gallery-comment__btn gallery-comment__btn--cancel"
                                          onClick={() => {
                                            setEditingComment(null);
                                            setEditCommentText('');
                                          }}
                                        >
                                          Отмена
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="gallery-comment__text">{comment.comment}</p>
                                      {canEdit && (
                                        <div className="gallery-comment__controls">
                                          <button
                                            className="gallery-comment__control-btn"
                                            onClick={() => {
                                              setEditingComment(comment.id);
                                              setEditCommentText(comment.comment);
                                            }}
                                            title="Редактировать"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="gallery-comment__control-btn"
                                            onClick={() => handleDeleteComment(comment.id, drawing.id)}
                                            title="Удалить"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="gallery-comments-empty">
                              <p>Пока нет комментариев</p>
                              <p className="gallery-comments-empty-hint">Будьте первым!</p>
                            </div>
                          )}
                        </div>

                        {userState.isAuthenticated && (
                          <div className="gallery-comment-form">
                            <textarea
                              className="gallery-comment-form__input"
                              placeholder="Напишите комментарий..."
                              value={newComment[drawing.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [drawing.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitComment(drawing.id);
                                }
                              }}
                              maxLength={500}
                              rows={2}
                            />
                            <button
                              className="gallery-comment-form__btn"
                              onClick={(e) => handleSubmitComment(drawing.id, e)}
                              disabled={submittingComment[drawing.id] || !newComment[drawing.id]?.trim()}
                            >
                              {submittingComment[drawing.id] ? '...' : 'Отправить'}
                            </button>
                          </div>
                        )}

                        {!userState.isAuthenticated && (
                          <div className="gallery-comments-auth-hint">
                            <p>Войдите, чтобы оставлять комментарии</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
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
