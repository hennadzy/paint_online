import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useLocation } from 'react-router-dom';
import userState from '../store/userState';
import '../styles/room-interface.scss';

const AuthPage = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  
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

  return (
    <div className="room-interface-overlay fullscreen" onClick={() => navigate('/')}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => navigate('/')}>×</button>

        <div className="room-welcome">
          <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
          <p>{isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}</p>
        </div>

        <div className="room-card about-content fullscreen">
          <div className="about-section">
            {userState.error && <div className="room-error">{userState.error}</div>}
            {localError && <div className="room-error">{localError}</div>}
            
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
              
              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="password"
                  name="password"
                  className="room-input"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="room-btn room-btn-primary"
                disabled={userState.loading}
                style={{ width: '100%', marginTop: '15px' }}
              >
                {userState.loading ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
              </button>
            </form>
            
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
          </div>
        </div>
      </div>
    </div>
  );
});

export default AuthPage;
