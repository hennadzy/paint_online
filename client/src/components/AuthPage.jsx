// client/src/components/AuthPage.jsx
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useLocation } from 'react-router-dom';
import userState from '../store/userState';

const AuthPage = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine mode from URL: /register shows registration, /login shows login
  const isLogin = location.pathname !== '/register';
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (isLogin) {
      // Login
      if (!formData.email || !formData.password) {
        setLocalError('Заполните все поля');
        return;
      }
      await userState.login(formData.email, formData.password);
    } else {
      // Registration
      if (!formData.username || !formData.email || !formData.password) {
        setLocalError('Заполните все поля');
        return;
      }
      if (formData.password.length < 6) {
        setLocalError('Пароль должен быть не менее 6 символов');
        return;
      }
      await userState.register(formData.username, formData.email, formData.password);
    }

    if (userState.isAuthenticated) {
      navigate('/profile');
    }
  };

  const switchMode = () => {
    // Toggle between /login and /register
    navigate(isLogin ? '/register' : '/login');
    setFormData({ username: '', email: '', password: '' });
    setLocalError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        
        {userState.error && <div className="error-message">{userState.error}</div>}
        {localError && <div className="error-message">{localError}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Имя пользователя</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Ваше имя"
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••"
              required
            />
          </div>
          
          <button type="submit" disabled={userState.loading}>
            {userState.loading ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        
        <p className="switch-link">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button onClick={switchMode} className="link-button">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
});

export default AuthPage;
