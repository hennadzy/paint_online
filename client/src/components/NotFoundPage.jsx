import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/not-found.scss';

const NotFoundPage = () => (
  <div className="not-found">
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

export default NotFoundPage;
