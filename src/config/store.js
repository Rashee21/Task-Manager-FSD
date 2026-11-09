// Small data-access layer over src/config/db.js (node:sqlite).
// Services and controllers call these functions, never raw SQL, so the
// MVC separation stays intact and the shape of the returned objects matches
// what the original Prisma version returned.
const db = require('./db');

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}
function userByEmail(email) { return db.prepare('SELECT * FROM "User" WHERE email = ?').get(email); }
function userById(id) { return db.prepare('SELECT * FROM "User" WHERE id = ?').get(id); }
function createUser({ name, email, passwordHash, role }) {
  const r = db.prepare('INSERT INTO "User" (name, email, passwordHash, role) VALUES (?, ?, ?, ?)').run(name, email, passwordHash, role || 'MEMBER');
  return userById(Number(r.lastInsertRowid));
}
function tagId(name) {
  let t = db.prepare('SELECT * FROM "Tag" WHERE name = ?').get(name);
  if (!t) { const r = db.prepare('INSERT INTO "Tag" (name) VALUES (?)').run(name); t = db.prepare('SELECT * FROM "Tag" WHERE id = ?').get(Number(r.lastInsertRowid)); }
  return t.id;
}
function tagsForTask(taskId) {
  return db.prepare('SELECT t.* FROM "Tag" t JOIN "_TaskToTag" j ON j."B" = t.id WHERE j."A" = ? ORDER BY t.name').all(taskId);
}
function setTaskTags(taskId, names) {
  db.prepare('DELETE FROM "_TaskToTag" WHERE "A" = ?').run(taskId);
  for (const name of (names || [])) db.prepare('INSERT OR IGNORE INTO "_TaskToTag" ("A", "B") VALUES (?, ?)').run(taskId, tagId(name));
}
function projectById(id) { return db.prepare('SELECT * FROM "Project" WHERE id = ?').get(id); }
function taskRow(id) { return db.prepare('SELECT * FROM "Task" WHERE id = ?').get(id); }
function taskWithRelations(task) {
  if (!task) return null;
  const assignedTo = task.assignedToId ? publicUser(userById(task.assignedToId)) : null;
  const createdBy = task.createdById ? publicUser(userById(task.createdById)) : null;
  return { ...task, assignedTo, createdBy, project: task.projectId ? projectById(task.projectId) : null, tags: tagsForTask(task.id) };
}
function createTask(data) {
  const r = db.prepare('INSERT INTO "Task" (title, description, status, priority, dueDate, projectId, assignedToId, createdById) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    data.title, data.description || null, data.status || 'TODO', data.priority || 'MEDIUM',
    data.dueDate ? new Date(data.dueDate).toISOString() : null,
    data.projectId || null, data.assignedToId || null, data.createdById);
  const id = Number(r.lastInsertRowid);
  setTaskTags(id, data.tags);
  return taskWithRelations(taskRow(id));
}
function updateTask(id, data) {
  const fields = [], values = [];
  for (const [key, col] of [['title', 'title'], ['description', 'description'], ['status', 'status'], ['priority', 'priority'], ['projectId', 'projectId'], ['assignedToId', 'assignedToId']]) {
    if (data[key] !== undefined) { fields.push(`"${col}" = ?`); values.push(data[key]); }
  }
  if (data.dueDate !== undefined) { fields.push('"dueDate" = ?'); values.push(data.dueDate ? new Date(data.dueDate).toISOString() : null); }
  fields.push('"updatedAt" = ?'); values.push(new Date().toISOString());
  if (fields.length > 1) db.prepare(`UPDATE "Task" SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  if (data.tags) setTaskTags(id, data.tags);
  return taskWithRelations(taskRow(id));
}
function deleteTask(id) { db.prepare('DELETE FROM "Task" WHERE id = ?').run(id); }
function auditCreate(taskId, userId, field, oldValue, newValue) {
  db.prepare('INSERT INTO "AuditLog" (taskId, userId, field, oldValue, newValue) VALUES (?, ?, ?, ?, ?)').run(taskId, userId, field, oldValue ?? null, newValue ?? null);
}
function auditForTask(taskId) {
  return db.prepare('SELECT a.*, u.name as userName, u.email as userEmail FROM "AuditLog" a JOIN "User" u ON u.id = a.userId WHERE a.taskId = ? ORDER BY a.createdAt DESC, a.id DESC').all(taskId)
    .map((r) => ({ id: r.id, taskId: r.taskId, field: r.field, oldValue: r.oldValue, newValue: r.newValue, createdAt: r.createdAt, user: { id: r.userId, name: r.userName, email: r.userEmail } }));
}
function refreshCreate(tokenHash, userId, expiresAt) {
  db.prepare('INSERT INTO "RefreshToken" (tokenHash, userId, expiresAt) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt.toISOString());
}
function refreshByHash(tokenHash) { return db.prepare('SELECT * FROM "RefreshToken" WHERE tokenHash = ?').get(tokenHash); }
function refreshRevoke(id) { db.prepare('UPDATE "RefreshToken" SET revoked = 1 WHERE id = ?').run(id); }
function refreshRevokeByHash(tokenHash) { db.prepare('UPDATE "RefreshToken" SET revoked = 1 WHERE tokenHash = ?').run(tokenHash); }

module.exports = { db, publicUser, userByEmail, userById, createUser, projectById, taskRow, taskWithRelations, createTask, updateTask, deleteTask, auditCreate, auditForTask, refreshCreate, refreshByHash, refreshRevoke, refreshRevokeByHash, tagsForTask, setTaskTags };
