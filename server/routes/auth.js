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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  validate: { xForwardedForHeader: false }
});

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    throw new ValidationError(usernameValidation.error);
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new ValidationError(emailValidation.error);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new ValidationError(passwordValidation.error);
  }

  const existingUser = await User.findByEmail(emailValidation.email) ||
                      await User.findByUsername(usernameValidation.username);
  if (existingUser) {
    throw new ValidationError('User already exists');
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
    message: 'Registration successful',
    user: userWithoutPassword,
    token
  });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password required');
  }

  const user = await User.findByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new AuthError('Invalid credentials');
  }

  if (!user.is_active) {
    throw new AuthError('Account is disabled', 403);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new AuthError('Invalid credentials');
  }

  const token = generateToken(user.id, user.username, user.role);

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'unknown';
  await Session.create(user.id, token, ipAddress, userAgent);

  await User.updateLastLogin(user.id);

  const { password_hash, ...userWithoutPassword } = user;
  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await Session.delete(token);
  }
  res.json({ message: 'Logout successful' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  res.json({ user });
}));

module.exports = router;
