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
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ValidationError, AuthError, NotFoundError } = require('../utils/errorHandler');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток
  message: 'Слишком много попыток входа, пожалуйста, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // 5 попыток регистрации
  message: 'Слишком много попыток регистрации, пожалуйста, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== 'string') {
    throw new ValidationError('Имя пользователя обязательно');
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    throw new ValidationError(usernameValidation.error);
  }

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email обязателен');
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new ValidationError(emailValidation.error);
  }

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Пароль обязателен');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new ValidationError(passwordValidation.error);
  }

  const existingUser = await User.findByEmail(emailValidation.email) ||
                      await User.findByUsername(usernameValidation.username);
  if (existingUser) {
    throw new ValidationError('Пользователь с таким email или именем уже существует');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    username: usernameValidation.username,
    email: emailValidation.email,
    passwordHash
  });

  const token = generateToken(user.id, user.username, user.role);

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'unknown';
  await Session.create(user.id, token, ipAddress, userAgent);

  const { password_hash, ...userWithoutPassword } = user;
  res.status(201).json({
    message: 'Регистрация успешна',
    user: userWithoutPassword,
    token
  });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email обязателен');
  }

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Пароль обязателен');
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new ValidationError(emailValidation.error);
  }

  const user = await User.findByEmail(emailValidation.email);
  if (!user) {
    throw new AuthError('Неверные учетные данные');
  }

  if (!user.is_active) {
    throw new AuthError('Аккаунт отключен', 403);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new AuthError('Неверные учетные данные');
  }

  const token = generateToken(user.id, user.username, user.role);

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'unknown';
  await Session.create(user.id, token, ipAddress, userAgent);

  await User.updateLastLogin(user.id);

  const { password_hash, ...userWithoutPassword } = user;
  res.json({
    message: 'Вход выполнен успешно',
    user: userWithoutPassword,
    token
  });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await Session.delete(token);
  }
  res.json({ message: 'Выход выполнен успешно' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new NotFoundError('Пользователь не найден');
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
}));

module.exports = router;
