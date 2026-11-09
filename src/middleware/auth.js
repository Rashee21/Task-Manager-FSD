const jwt = require('jsonwebtoken');
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { const e = new Error('Missing or invalid Authorization header. Use: Authorization: Bearer <accessToken>'); e.status = 401; return next(e); }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    const e = new Error('Access token is invalid or expired. Call POST /api/auth/refresh with your refresh token.'); e.status = 401; next(e);
  }
}
// requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const e = new Error('Forbidden: this route requires role ' + roles.join(' or ')); e.status = 403; return next(e);
    }
    next();
  };
}
module.exports = { requireAuth, requireRole };
