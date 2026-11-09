const bcrypt = require('bcryptjs');
const store = require('../config/store');
const { signAccess, signRefresh, hashToken } = require('../utils/tokens');

async function register({ name, email, password }) {
  if (store.userByEmail(email)) { const e = new Error('Email is already registered'); e.status = 409; throw e; }
  const user = store.createUser({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'MEMBER' });
  return store.publicUser(user);
}
async function login({ email, password }) {
  const user = store.userByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const e = new Error('Invalid email or password'); e.status = 401; throw e;
  }
  const refreshToken = signRefresh(user);
  store.refreshCreate(hashToken(refreshToken), user.id, new Date(Date.now() + 7 * 86400000));
  return { user: store.publicUser(user), accessToken: signAccess(user), refreshToken };
}
async function refresh(oldToken) {
  const jwt = require('jsonwebtoken');
  let payload;
  try { payload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET); }
  catch { const e = new Error('Refresh token is invalid or expired'); e.status = 401; throw e; }
  const stored = store.refreshByHash(hashToken(oldToken));
  if (!stored || stored.revoked || new Date(stored.expiresAt) < new Date()) {
    const e = new Error('Refresh token is invalid or expired'); e.status = 401; throw e;
  }
  const user = store.userById(payload.id);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  store.refreshRevoke(stored.id);
  const newRefresh = signRefresh(user);
  store.refreshCreate(hashToken(newRefresh), user.id, new Date(Date.now() + 7 * 86400000));
  return { user: store.publicUser(user), accessToken: signAccess(user), refreshToken: newRefresh };
}
async function logout(oldToken) {
  if (oldToken) store.refreshRevokeByHash(hashToken(oldToken));
}
module.exports = { register, login, refresh, logout, publicUser: store.publicUser };
