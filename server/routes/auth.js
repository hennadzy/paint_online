const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const { pgPool } = require('../config/db');
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
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const PersonalMessageStore = require('../services/PersonalMessageStore');
const WebSocketHandler = require('../services/WebSocketHandler');

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

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@paint-online.ru';
  try {
    await sendWelcomeEmail({
      to: user.email,
      username: user.username,
      supportEmail
    });
  } catch (emailError) {
    if (emailError?.code === 'SMTP_NOT_CONFIGURED') {
      throw new ValidationError('Почтовый сервис не настроен. Обратитесь к администратору.');
    }
    console.error('Welcome email send error:', emailError);
    throw new ValidationError('Не удалось отправить приветственное письмо. Попробуйте позже.');
  }

  try {
    const adminResult = await pgPool.query(
      `SELECT id, username
       FROM users
       WHERE LOWER(username) = LOWER($1) AND is_deleted IS NOT TRUE
       LIMIT 1`,
      ['admin']
    );

    const adminUser = adminResult.rows[0];
    if (adminUser?.id) {
      const fromUserId = adminUser.id;
      const welcomeText = `Добро пожаловать в Рисование.Онлайн, ${user.username}! 🎨\n\nРисуйте, наслаждайтесь, публикуйте работы в галерее и общайтесь с другими пользователями.\n\nЕсли есть вопросы — пишите на почту ${supportEmail} или сюда в ЛС.`;

      const ts = Date.now();
      const msgId = await PersonalMessageStore.saveMessage(fromUserId, user.id, welcomeText, ts);
      if (msgId) {
        await WebSocketHandler.deliverPersonalMessageToUser(
          user.id,
          fromUserId,
          adminUser.username,
          welcomeText,
          ts,
          msgId
        );
      }
    } else {
      console.warn('Welcome PM skipped: admin user not found');
    }
  } catch (pmError) {
    console.error('Welcome personal message send error:', pmError);
  }

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

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // 3 попытки
  message: 'Слишком много попыток сброса пароля, пожалуйста, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// Запрос на восстановление пароля
router.post('/forgot-password', resetPasswordLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email обязателен');
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new ValidationError(emailValidation.error);
  }

  const user = await User.findByEmail(emailValidation.email);
  if (!user) {
    // В целях безопасности не сообщаем, что пользователь не найден
    return res.json({ message: 'Если пользователь с таким email существует, инструкция будет отправлена' });
  }

  // Генерируем токен восстановления
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 час

  // Сохраняем токен в базе данных
  await pgPool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, resetToken, expiresAt, Date.now()]
  );

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      resetLink
    });
  } catch (emailError) {
    if (emailError?.code === 'SMTP_NOT_CONFIGURED') {
      throw new ValidationError('Почтовый сервис не настроен. Восстановление пароля сейчас недоступно.');
    }
    console.error('Password reset email send error:', emailError);
    throw new ValidationError('Не удалось отправить письмо для восстановления пароля. Попробуйте позже.');
  }

  res.json({ message: 'Инструкция по восстановлению пароля отправлена на email' });
}));

// Сброс пароля
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Токен обязателен');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw new ValidationError('Новый пароль обязателен');
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new ValidationError(passwordValidation.error);
  }

  // Ищем токен в базе данных
  const tokenResult = await pgPool.query(
    `SELECT prt.*, u.id AS user_id, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token = $1 AND prt.used = FALSE`,
    [token]
  );

  if (tokenResult.rows.length === 0) {
    throw new ValidationError('Неверный или истекший токен');
  }

  const tokenData = tokenResult.rows[0];

  // Проверяем срок действия токена
  if (tokenData.expires_at < Date.now()) {
    throw new ValidationError('Токен истек');
  }

  // Хешируем новый пароль
  const passwordHash = await hashPassword(newPassword);

  // Обновляем пароль пользователя
  await pgPool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, tokenData.user_id]
  );

  // Помечаем токен как использованный
  await pgPool.query(
    `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
    [tokenData.id]
  );

  // Удаляем все сессии пользователя (принудительный выход)
  await pgPool.query(
    `DELETE FROM sessions WHERE user_id = $1`,
    [tokenData.user_id]
  );

  res.json({ message: 'Пароль успешно изменен' });
}));

// Проверка токена (для валидации на клиенте)
router.post('/verify-reset-token', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Токен обязателен');
  }

  const result = await pgPool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND used = FALSE AND expires_at > $2`,
    [token, Date.now()]
  );

  if (result.rows.length === 0) {
    throw new ValidationError('Неверный или истекший токен');
  }

  res.json({ valid: true });
}));

module.exports = router;
