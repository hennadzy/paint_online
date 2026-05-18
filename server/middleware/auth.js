const { verifyToken } = require('../utils/auth');
const Session = require('../models/Session');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`No auth header from IP: ${req.ip || req.connection.remoteAddress}`);
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn(`Invalid token attempt from IP: ${req.ip || req.connection.remoteAddress}, token: ${token.substring(0,20)}...`);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`Token decoded successfully: userId=${decoded.userId}, username=${decoded.username}`);

    const session = await Session.findByToken(token);
    if (!session) {
      console.warn(`Session not found for token from IP: ${req.ip || req.connection.remoteAddress}, userId: ${decoded.userId}`);
      console.log(`Creating new session for user ${decoded.userId}...`);
      
      const SessionModel = require('../models/Session');
      await SessionModel.create(decoded.userId, token, req.ip || req.connection.remoteAddress, req.get('User-Agent') || 'unknown');
      
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };

      return next();
    }

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

async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return next();
    const session = await Session.findByToken(token);
    if (!session) return next();
    req.user = { userId: session.user_id, username: session.username, role: session.role };
    next();
  } catch (error) {
    next();
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
  requireSuperAdmin
};
