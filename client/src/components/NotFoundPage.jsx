import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/not-found.scss';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  boxSizing: 'border-box',
  background: 'rgba(0, 0, 0, 0.95)',
  zIndex: 999999,
  overflowY: 'auto',
};

const cardStyle = {
  position: 'relative',
  textAlign: 'center',
  background: 'rgba(103, 103, 103, 0.9)',
  borderRadius: 16,
  padding: '40px 32px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  maxWidth: 400,
};

const titleStyle = { fontFamily: 'sans-serif', fontSize: 22, color: '#fff', margin: '0 0 12px' };
const textStyle = { fontFamily: 'sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.9)', margin: '0 0 24px', lineHeight: 1.5 };
const btnStyle = { display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #ffcc00, #ff6699)', color: '#333', fontWeight: 600, fontSize: 16, textDecoration: 'none' };

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

  return (
    <div className="not-found-overlay" style={overlayStyle}>
      <div className="not-found__card" style={cardStyle}>
        <div className="not-found__code">404</div>
        <h1 className="not-found__title" style={titleStyle}>Страница не найдена</h1>
        <p className="not-found__text" style={textStyle}>
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link to="/" className="not-found__btn" style={btnStyle}>
          На главную
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
