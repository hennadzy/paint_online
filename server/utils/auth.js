const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET || 'paint_online_default_secret_change_in_production';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(userId, username, role) {
  return jwt.sign(
    {
      userId,
      username,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email обязателен' };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return { valid: false, error: 'Некорректный email' };
  }
  
  return { valid: true, email: trimmed };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Пароль должен быть не менее 6 символов' };
  }
  
  if (password.length > 72) {
    return { valid: false, error: 'Пароль слишком длинный' };
  }
  
  return { valid: true };
}

function validateUsername(username) {
  if (typeof username !== 'string') {
    return { valid: false, error: 'Имя должно быть текстом' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Введите имя' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Имя должно быть не менее 2 символов' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Имя не должно превышать 30 символов' };
  }
  
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Имя может содержать только буквы, цифры, пробелы, _ и -' };
  }
  
  const lower = trimmed.toLowerCase();
  
  // Запрещаем создавать новые имена "admin", но разрешаем существующему админу входить
  if (lower === 'admin') {
    return { valid: false, error: `Имя "${trimmed}" зарезервировано системой` };
  }
  
  // Проверка на запрещенные слова
  const forbidden = ['moderator', 'system', 'bot', 'null', 'undefined'];
  for (const word of forbidden) {
    if (lower.includes(word)) {
      return { valid: false, error: `Имя не может содержать "${word}"` };
    }
  }
  
  return { valid: true, username: trimmed };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validateEmail,
  validatePassword,
  validateUsername
};
