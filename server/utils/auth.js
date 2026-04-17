const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const validator = require('validator');
const crypto = require('crypto');

const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 12;

// Требовать JWT_SECRET в production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production. Please set it in your deployment configuration.');
  } else {
    console.warn('WARNING: JWT_SECRET not set. Using generated secret for development only. Set JWT_SECRET environment variable!');
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long for security');
}

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

  if (password.length < 8) {
    return { valid: false, error: 'Пароль должен быть не менее 8 символов' };
  }

  if (password.length > 72) {
    return { valid: false, error: 'Пароль слишком длинный' };
  }

  // Требовать хотя бы одну цифру и одну букву
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну букву' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру' };
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

  const reservedUsernames = ['admin', 'administrator', 'админ', 'администратор'];
  if (reservedUsernames.includes(lower)) {
    return { valid: false, error: `Имя "${trimmed}" зарезервировано системой` };
  }

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
