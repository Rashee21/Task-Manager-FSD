const store = require('../config/store');
const asyncHandler = require('../middleware/asyncHandler');
const create = asyncHandler(async (req, res) => {
  const r = store.db.prepare('INSERT INTO "Project" (name, description, ownerId) VALUES (?, ?, ?)').run(req.body.name, req.body.description || null, req.user.id);
  res.status(201).json({ project: store.projectById(Number(r.lastInsertRowid)) });
});
const list = asyncHandler(async (req, res) => {
  const projects = store.db.prepare('SELECT p.*, u.name as ownerName, u.email as ownerEmail, (SELECT COUNT(*) FROM "Task" WHERE projectId = p.id) as taskCount FROM "Project" p JOIN "User" u ON u.id = p.ownerId').all()
    .map((p) => ({ id: p.id, name: p.name, description: p.description, ownerId: p.ownerId, createdAt: p.createdAt, owner: { id: p.ownerId, name: p.ownerName, email: p.ownerEmail }, _count: { tasks: p.taskCount } }));
  res.json({ projects });
});
const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!store.projectById(id)) { const e = new Error('Project not found'); e.status = 404; throw e; }
  store.db.prepare('UPDATE "Task" SET projectId = NULL WHERE projectId = ?').run(id);
  store.db.prepare('DELETE FROM "Project" WHERE id = ?').run(id);
  res.json({ message: 'Project deleted' });
});
module.exports = { create, list, remove };
