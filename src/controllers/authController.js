const authService = require('../services/authService');
const store = require('../config/store');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const register = asyncHandler(async (req, res) => { res.status(201).json({ user: await authService.register(req.body) }); });
const login = asyncHandler(async (req, res) => { res.json(await authService.login(req.body)); });
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) { const e = new Error('refreshToken is required'); e.status = 400; throw e; }
  res.json(await authService.refresh(refreshToken));
});
const logout = asyncHandler(async (req, res) => { await authService.logout(req.body && req.body.refreshToken); res.json({ message: 'Logged out' }); });
const me = asyncHandler(async (req, res) => { res.json({ user: store.publicUser(store.userById(req.user.id)) }); });
const createUser = asyncHandler(async (req, res) => {
  if (store.userByEmail(req.body.email)) { const e = new Error('Email is already registered'); e.status = 409; throw e; }
  const user = store.createUser({ name: req.body.name, email: req.body.email, passwordHash: await bcrypt.hash(req.body.password, 10), role: req.body.role || 'MEMBER' });
  res.status(201).json({ user: store.publicUser(user) });
});
module.exports = { register, login, refresh, logout, me, createUser };
