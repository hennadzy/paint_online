import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import userState from '../store/userState';
import { API_URL } from '../store/canvasState';
import axios from 'axios';
import '../styles/room-interface.scss';

const EyeIcon = ({ visible, onClick }) => (
  <button
    type="button"
    className="password-toggle"
    onClick={onClick}
    tabIndex={-1}
    aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
  >
    {visible ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )}
  </button>
);

const AuthPage = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isLogin = location.pathname !== '/register';
  const isResetPassword = location.pathname === '/reset-password';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (isLogin) {
      if (!formData.email || !formData.password) {
        setLocalError('Заполните все поля');
        return;
      }
      await userState.login(formData.email, formData.password);
    } else {
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
    navigate(isLogin ? '/register' : '/login');
    setFormData({ username: '', email: '', password: '' });
    setLocalError('');
  };

  // Проверка токена при загрузке страницы сброса пароля
  React.useEffect(() => {
    if (isResetPassword) {
      const token = searchParams.get('token');
      if (token) {
        setResetToken(token);
        verifyResetToken(token);
      } else {
        setLocalError('Отсутствует токен сброса пароля');
      }
    }
  }, [isResetPassword, searchParams]);

  const verifyResetToken = async (token) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-reset-token`, { token });
      if (!response.data.valid) {
        setLocalError('Неверный или истекший токен');
      }
    } catch (error) {
      setLocalError('Неверный или истекший токен');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setLocalError('Введите email');
      return;
    }

    setResetLoading(true);
    setLocalError('');

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: resetEmail });
      setResetSuccess(true);
      setShowForgotPassword(false);
    } catch (error) {
      setLocalError(error.response?.data?.error || 'Ошибка отправки запроса');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!formData.password) {
      setLocalError('Введите новый пароль');
      return;
    }
    if (formData.password.length < 6) {
      setLocalError('Пароль должен быть не менее 6 символов');
      return;
    }

    setResetLoading(true);
    setLocalError('');

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token: resetToken,
        newPassword: formData.password
      });
      setResetSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setLocalError(error.response?.data?.error || 'Ошибка сброса пароля');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="room-interface-overlay fullscreen" onClick={() => navigate('/')}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => navigate('/')}>×</button>

        <div className="room-welcome">
          <h1>{isResetPassword ? 'Сброс пароля' : showForgotPassword ? 'Забыли пароль?' : (isLogin ? 'Вход' : 'Регистрация')}</h1>
          <p>
            {isResetPassword
              ? 'Введите новый пароль'
              : showForgotPassword
              ? 'Введите email для восстановления пароля'
              : isLogin
              ? 'Войдите в свой аккаунт'
              : 'Создайте новый аккаунт'}
          </p>
        </div>

        <div className="room-card about-content fullscreen">
          <div className="about-section">
            {userState.error && <div className="room-error">{userState.error}</div>}
            {localError && <div className="room-error">{localError}</div>}

            {resetSuccess && (
              <div className="room-success" style={{ background: 'rgba(40,167,69,0.12)', border: '1px solid rgba(40,167,69,0.3)', borderRadius: '8px', color: '#5cb85c', padding: '12px', textAlign: 'center', marginBottom: '15px' }}>
                {isResetPassword
                  ? 'Пароль успешно изменен! Перенаправление на страницу входа...'
                  : 'Если пользователь с таким email существует, инструкция будет отправлена на указанный адрес.'}
              </div>
            )}

            {isResetPassword ? (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>Новый пароль</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="room-input"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••"
                      required
                    />
                    <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="room-btn room-btn-primary"
                  disabled={resetLoading}
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  {resetLoading ? 'Подождите...' : 'Изменить пароль'}
                </button>
              </form>
            ) : showForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="room-input"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setLocalError(''); }}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="room-btn room-btn-primary"
                  disabled={resetLoading}
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  {resetLoading ? 'Подождите...' : 'Отправить'}
                </button>

                <button
                  type="button"
                  className="room-btn room-btn-ghost"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setLocalError('');
                    setResetSuccess(false);
                  }}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  Отмена
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="form-group">
                    <label>Имя пользователя</label>
                    <input
                      type="text"
                      name="username"
                      className="room-input"
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
                    className="room-input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="form-group password-input-group">
                  <label>Пароль</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="room-input"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••"
                      required
                    />
                    <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="room-btn room-btn-primary"
                  disabled={userState.loading}
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  {userState.loading ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                </button>

                {isLogin && (
                  <button
                    type="button"
                    className="room-btn room-btn-ghost"
                    onClick={() => setShowForgotPassword(true)}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    Забыли пароль?
                  </button>
                )}
              </form>
            )}

            {!showForgotPassword && !isResetPassword && (
              <p className="switch-link" style={{ textAlign: 'center', marginTop: '20px' }}>
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  onClick={switchMode}
                  className="link-button"
                  style={{ background: 'none', border: 'none', color: '#ffcc00', textDecoration: 'underline', cursor: 'pointer', marginLeft: '5px' }}
                >
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AuthPage;
