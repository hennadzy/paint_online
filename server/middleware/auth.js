// server/middleware/auth.js
const { verifyToken } = require('../utils/auth');
const Session = require('../models/Session');

/**
 * Middleware для проверки аутентификации
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Проверка JWT
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Проверка сессии в БД
    const session = await Session.findByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Session not found or expired' });
    }

    // Добавляем информацию о пользователе в запрос
    req.user = {
      userId: session.user_id,
      username: session.username,
      role: session.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware для проверки роли администратора
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware для проверки роли суперадмина
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requireSuperAdmin
};
