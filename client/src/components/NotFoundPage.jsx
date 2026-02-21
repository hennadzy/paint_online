import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../styles/not-found.scss';

const NotFoundPage = () => {
  useEffect(() => {
    document.title = '404 — Страница не найдена | Рисование онлайн';
    document.body.classList.add('modal-open');
    const fallback = document.getElementById('server-404-fallback');
    if (fallback) fallback.hidden = true;
    return () => {
      document.body.classList.remove('modal-open');
      if (fallback) fallback.hidden = false;
    };
  }, []);

  const content = (
    <div className="not-found-overlay">
      <div className="not-found__card">
        <div className="not-found__code">404</div>
        <h1 className="not-found__title">Страница не найдена</h1>
        <p className="not-found__text">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link to="/" className="not-found__btn">
          На главную
        </Link>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default NotFoundPage;
