const jwt = require('jsonwebtoken');
const crypto = require('crypto');
function signAccess(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function signRefresh(user) {
  return jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
module.exports = { signAccess, signRefresh, hashToken };
