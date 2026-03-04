// server/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Session = require('../models/Session');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  validateEmail,
  validatePassword,
  validateUsername
} = require('../utils/auth');
const { authenticate } = require('../middleware/auth'); // создадим позже

const router = express.Router();

// Rate limiting для аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Валидация
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Проверка существования пользователя
    const existingUser = await User.findByEmail(emailValidation.email) || 
                        await User.findByUsername(usernameValidation.username);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Хеширование пароля и создание пользователя
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username: usernameValidation.username,
      email: emailValidation.email,
      passwordHash
    });

    // Генерация токена
    const token = generateToken(user.id, user.username, user.role);

    // Создание сессии
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    await Session.create(user.id, token, ipAddress, userAgent);

    // Отправка ответа (без пароля)
    const { password_hash, ...userWithoutPassword } = user;
    res.status(201).json({
      message: 'Registration successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Вход пользователя
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Поиск пользователя
    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Проверка активности
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Проверка пароля
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Генерация токена
    const token = generateToken(user.id, user.username, user.role);

    // Создание сессии
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    await Session.create(user.id, token, ipAddress, userAgent);

    // Обновление времени последнего входа
    await User.updateLastLogin(user.id);

    // Отправка ответа
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * POST /api/auth/logout
 * Выход пользователя
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await Session.delete(token);
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
