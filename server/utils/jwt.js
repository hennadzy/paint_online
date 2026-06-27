const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_EXPIRATION = '24h';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  } else {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

function generateToken(roomId, username, isPublic, role = 'user', userId = null) {
  const payload = { roomId, username, isPublic, role, iat: Math.floor(Date.now() / 1000) };
  if (userId) payload.userId = userId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
