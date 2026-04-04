const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'paint_online_default_secret_change_in_production';
const JWT_EXPIRATION = '1h';

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
