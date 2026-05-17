import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import userState from '../store/userState';
import { API_URL } from '../store/canvasState';
import { useSeo } from './SeoMeta';
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
  const { id: drawingIdParam } = useParams();
  const drawingId = drawingIdParam ? parseInt(drawingIdParam, 10) : null;
  const { setSeoData } = useSeo();
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likingId, setLikingId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [drawingLoading, setDrawingLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [commentLikeLoading, setCommentLikeLoading] = useState({});
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const initialDistanceRef = useRef(0);
  const initialZoomRef = useRef(1);
  const imageContainerRef = useRef(null);

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

  useEffect(() => {
    if (selectedDrawing) {
      const commentsCount = comments.length;
      setSeoData({
        title: `${selectedDrawing.title} - рисунок в галерее Рисование.Онлайн`,
        description: `Рисунок "${selectedDrawing.title}" автора ${selectedDrawing.author_name}. Открывайте изображение и комментарии (${commentsCount}) на отдельной странице работы.`,
        keywords: `рисунок ${selectedDrawing.title}, комментарии к рисунку, ${selectedDrawing.author_name}, галерея рисунков`,
        canonical: `https://risovanie.online/gallery/${selectedDrawing.id}`
      });
      return;
    }

    if (!loading && !error && drawings.length > 0) {
      setSeoData({
        title: 'Галерея рисунков пользователей - работы сообщества Рисование.Онлайн',
        description: `Смотрите галерею рисунков пользователей: ${drawings.length} работ от авторов, отдельные страницы изображений и обсуждения в комментариях.`,
        keywords: `галерея рисунков пользователей, рисунки онлайн, ${drawings.length} работ, комментарии к рисункам`,
        canonical: 'https://risovanie.online/gallery'
      });
    } else if (!loading && !error && drawings.length === 0) {
      setSeoData({
        title: 'Галерея рисунков пользователей - добавить работу',
        description: 'Галерея рисунков пользователей Рисование.Онлайн. Добавьте первую работу и откройте отдельную страницу рисунка с комментариями.',
        keywords: 'галерея рисунков, добавить рисунок, комментарии к рисункам',
        canonical: 'https://risovanie.online/gallery'
      });
    }
  }, [drawings, loading, error, setSeoData, selectedDrawing, comments.length]);

  const fetchDrawingById = useCallback(async (id) => {
    if (!id) return;
    setDrawingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/gallery/drawing/${id}`, { headers });
      setSelectedDrawing(response.data.drawing);
    } catch (err) {
      navigate('/gallery');
    } finally {
      setDrawingLoading(false);
    }
  }, [navigate]);

  const fetchComments = useCallback(async (id) => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/gallery/${id}/comments`, { headers });
      setComments(response.data.comments || []);
    } catch (err) {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (drawingId) {
      fetchDrawingById(drawingId);
      fetchComments(drawingId);
    } else {
      setSelectedDrawing(null);
      setComments([]);
      setZoom(1);
      zoomRef.current = 1;
    }
  }, [drawingId, fetchDrawingById, fetchComments]);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !selectedDrawing) return;

    const clampZoom = (value) => Math.max(1, Math.min(3, value));
    const getDistance = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const nextZoom = clampZoom(zoomRef.current + (e.deltaY > 0 ? -0.1 : 0.1));
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
        initialZoomRef.current = zoomRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialDistanceRef.current > 0) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistanceRef.current;
        const nextZoom = clampZoom(initialZoomRef.current * scale);
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        initialDistanceRef.current = 0;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [selectedDrawing]);

  const handleLike = async (targetDrawingId) => {
    if (!userState.isAuthenticated) return;
    if (likingId === targetDrawingId) return;

    setLikingId(targetDrawingId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/gallery/${targetDrawingId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { liked, likesCount } = response.data;
      setDrawings(prev =>
        prev.map(d =>
          d.id === targetDrawingId
            ? { ...d, user_liked: liked, likes_count: likesCount }
            : d
        )
      );
      setSelectedDrawing(prev => (prev && prev.id === targetDrawingId ? { ...prev, user_liked: liked, likes_count: likesCount } : prev));
    } catch (err) {
    } finally {
      setLikingId(null);
    }
  };

  const handleSubmitComment = async (e) => {
    if (e) e.stopPropagation();
    if (!userState.isAuthenticated) {
      alert('Войдите, чтобы оставлять комментарии');
      return;
    }
    const commentText = newComment.trim();
    if (!commentText) return;

    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/gallery/${drawingId}/comments`,
        { comment: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => [...prev, response.data.comment]);
      setNewComment('');
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, comments_count: Number(d.comments_count || 0) + 1 }
            : d
        )
      );
      setSelectedDrawing(prev => (prev ? { ...prev, comments_count: Number(prev.comments_count || 0) + 1 } : prev));
    } catch (err) {
      alert('Ошибка отправки комментария');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!userState.isAuthenticated) return;

    setSubmittingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/gallery/comments/${commentId}`,
        { comment: editCommentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => prev.map(c =>
          c.id === commentId ? response.data.comment : c
      ));

      setEditingComment(null);
      setEditCommentText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка редактирования комментария');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!userState.isAuthenticated) return;
    if (!window.confirm('Удалить комментарий?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/gallery/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => prev.filter(c => c.id !== commentId));
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, comments_count: Math.max(0, Number(d.comments_count || 0) - 1) }
            : d
        )
      );
      setSelectedDrawing(prev => (prev ? { ...prev, comments_count: Math.max(0, Number(prev.comments_count || 0) - 1) } : prev));
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка удаления комментария');
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!userState.isAuthenticated || commentLikeLoading[commentId]) return;
    setCommentLikeLoading(prev => ({ ...prev, [commentId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/gallery/comments/${commentId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(prev => prev.map(comment => (
        comment.id === commentId
          ? { ...comment, user_liked: response.data.liked, likes_count: response.data.likesCount }
          : comment
      )));
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка лайка комментария');
    } finally {
      setCommentLikeLoading(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleImageError = (id) => {
    console.log(`[CLIENT-GALLERY] Image load failed for ID=${id}`);
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(Number(ts));
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleImageClick = (drawing) => {
    navigate(`/gallery/${drawing.id}`);
  };

  const handleBackToFeed = () => {
    navigate('/gallery');
    setZoom(1);
    zoomRef.current = 1;
  };

  if (drawingId) {
    if (drawingLoading || !selectedDrawing) {
      return (
        <div className="gallery-page">
          <main className="gallery-main">
            <div className="gallery-loading">
              <div className="gallery-spinner" />
              <p>Загрузка рисунка...</p>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="gallery-page gallery-page--detail">
        <header className="gallery-header">
          <button className="gallery-back-btn" onClick={handleBackToFeed}>← В галерею</button>
          <h1 className="gallery-title">{selectedDrawing.title}</h1>
          <div className="gallery-header-spacer" />
        </header>
        <main className="gallery-main">
           <div className="gallery-detail">
             <div className="gallery-detail__image-wrap" ref={imageContainerRef}>
               {imageErrors[selectedDrawing.id] ? (
                 <div className="gallery-detail__image-fallback">
                   <span>🖼️</span>
                 </div>
               ) : (
                 <img
                   src={`${API_URL}/api/gallery/image/${selectedDrawing.id}`}
                   alt={selectedDrawing.title}
                   className="gallery-detail__image"
                   style={{ transform: `scale(${zoom})` }}
                   onError={() => handleImageError(selectedDrawing.id)}
                 />
               )}
             </div>
            <div className="gallery-detail__meta">
              <p>✏️ {selectedDrawing.author_name}</p>
              <p>{formatDate(selectedDrawing.approved_at || selectedDrawing.created_at)}</p>
              <button
                className={`gallery-like-btn ${selectedDrawing.user_liked ? 'liked' : ''} ${!userState.isAuthenticated ? 'disabled' : ''}`}
                onClick={() => userState.isAuthenticated && handleLike(selectedDrawing.id)}
                disabled={likingId === selectedDrawing.id || !userState.isAuthenticated}
              >
                <HeartIcon filled={selectedDrawing.user_liked} />
                <span className="gallery-like-count">{selectedDrawing.likes_count}</span>
              </button>
            </div>

            <section className="gallery-detail__comments">
              <h2>Комментарии</h2>
              {commentsLoading ? (
                <div className="gallery-comments-loading">Загрузка комментариев...</div>
              ) : (
                <div className="gallery-comments-list gallery-comments-list--detail">
                  {comments.length > 0 ? comments.map(comment => {
                    const isCommentAuthor = comment.user_id === userState.user?.id;
                    const isAdmin = ['admin', 'superadmin'].includes(userState.user?.role);
                    const canEdit = isCommentAuthor || isAdmin;
                    return (
                      <div key={comment.id} className="gallery-comment">
                        <div className="gallery-comment__header">
                          <span className="gallery-comment__author">{comment.author_name}</span>
                          <span className="gallery-comment__date">{formatDate(comment.created_at)}</span>
                        </div>
                        {editingComment === comment.id ? (
                          <div className="gallery-comment__edit">
                            <textarea
                              className="gallery-comment__textarea"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              maxLength={500}
                            />
                            <div className="gallery-comment__actions">
                              <button
                                className="gallery-comment__btn gallery-comment__btn--save"
                                onClick={() => handleEditComment(comment.id)}
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
                            <div className="gallery-comment__controls">
                              <button
                                className={`gallery-like-btn ${comment.user_liked ? 'liked' : ''} ${!userState.isAuthenticated ? 'disabled' : ''}`}
                                onClick={() => handleLikeComment(comment.id)}
                                disabled={!userState.isAuthenticated || commentLikeLoading[comment.id]}
                                title={userState.isAuthenticated ? 'Лайкнуть комментарий' : 'Войдите, чтобы лайкать комментарии'}
                              >
                                <HeartIcon filled={comment.user_liked} />
                                <span className="gallery-like-count">{comment.likes_count || 0}</span>
                              </button>
                              {canEdit && (
                                <>
                                  <button
                                    className="gallery-comment__control-btn"
                                    onClick={() => {
                                      setEditingComment(comment.id);
                                      setEditCommentText(comment.comment);
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="gallery-comment__control-btn"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="gallery-comments-empty">
                      <p>Пока нет комментариев</p>
                    </div>
                  )}
                </div>
              )}

              {userState.isAuthenticated ? (
                <div className="gallery-comment-form">
                  <textarea
                    className="gallery-comment-form__input"
                    placeholder="Напишите комментарий..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <button
                    className="gallery-comment-form__btn"
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment ? '...' : 'Отправить'}
                  </button>
                </div>
              ) : (
                <div className="gallery-comments-auth-hint">
                  <p>Войдите, чтобы оставлять комментарии и лайкать чужие комментарии</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

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

        {!loading && !error && drawings.length > 0 && (
          <section className="gallery-auth-hint-top" aria-label="Правила участия в галерее">
            <div className="gallery-auth-hint-top__text">
              Добавлять рисунки в галерею, оставлять комментарии и ставить оценки могут только{' '}
              {userState.isAuthenticated ? (
                'авторизованные'
              ) : (
                <>
                  <a
                    href="/login"
                    className="gallery-auth-hint-top__link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/login');
                    }}
                  >
                    авторизованные
                  </a>{' '}
                </>
              )}{' '}
              пользователи.
            </div>
            {!userState.isAuthenticated && (
              <button
                type="button"
                className="gallery-auth-hint-top__btn"
                onClick={() => navigate('/register')}
              >
                Зарегистрироваться
              </button>
            )}
          </section>
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
                      className="gallery-comments-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/gallery/${drawing.id}`);
                      }}
                      title="Открыть комментарии"
                    >
                      💬 Комментарии ({parseInt(drawing.comments_count, 10) || 0})
                    </button>
                    <button
                      className={`gallery-like-btn ${drawing.user_liked ? 'liked' : ''} ${!userState.isAuthenticated ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        userState.isAuthenticated && handleLike(drawing.id);
                      }}
                      disabled={likingId === drawing.id || !userState.isAuthenticated}
                      title={
                        userState.isAuthenticated
                          ? drawing.user_liked
                            ? 'Убрать лайк'
                            : 'Поставить лайк'
                          : 'Войдите, чтобы ставить лайки'
                      }
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

        {!loading && !error && drawings.length > 0 && (
          <section className="gallery-seo-bottom" aria-label="Информация о галерее">
            <div className="gallery-seo-bottom__text">
              <p>
                На этой странице собрана галерея рисунков пользователей проекта «Рисование.Онлайн».
                Здесь можно добавлять рисунок, знакомиться с работами других авторов и участвовать в обсуждениях.
                Галерея объединяет творцов разного уровня: от начинающих до профессиональных художников,
                создавая пространство для обмена опытом и вдохновения.
              </p>
              <p>
                Открывайте понравившиеся изображения, оставляйте комментарии к рисункам и ставьте
                оценки — так сообщество помогает авторам получать обратную связь и вдохновение.
                Каждая работа уникальна: цифровые иллюстрации, скетчи, детские рисунки, концепт-арты
                и экспериментальные стили представлены в одном месте.
              </p>
              <p>
                Хотите поделиться своим творчеством? Войдите в аккаунт и начните участвовать в галерее: публикуйте работы,
                комментируйте и поддерживайте участников лайками. Это отличный способ получить признание
                за свои усилия и найти единомышленников среди любителей искусства.
              </p>
              <p>
                Галерея работает круглосуточно — вы можете просматривать новые поступления в любое время,
                следить за любимыми авторами и открывать для себя неожиданные направления в цифровом искусстве.
                Регулярно появляются свежие работы, так что возвращайтесь почаще, чтобы не пропустить интересные проекты.
              </p>
              <p>
                Участие в галерее бесплатное и доступное для всех зарегистрированных пользователей.
                Создайте аккаунт за пару минут, загрузите свой лучший рисунок и станьте частью творческого сообщества.
                Рисование.Онлайн — это место, где идеи обретают форму, а таланты находят свою аудиторию.
                Перейдите на <a href="/">главную страницу</a>, чтобы начать рисовать онлайн или попробовать <a href="/coloring">раскраски</a>.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
});

export default GalleryPage;
