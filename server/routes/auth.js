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

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  validate: { xForwardedForHeader: false }
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

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

    const existingUser = await User.findByEmail(emailValidation.email) ||
                        await User.findByUsername(usernameValidation.username);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
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

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

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
