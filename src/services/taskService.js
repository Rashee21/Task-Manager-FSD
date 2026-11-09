const store = require('../config/store');
const { canTransition } = require('../utils/statusMachine');
const { sendMail } = require('../utils/mail');

async function writeAudit(taskId, userId, changes) {
  for (const c of changes) {
    if (String(c.oldValue ?? '') === String(c.newValue ?? '')) continue;
    store.auditCreate(taskId, userId, c.field, c.oldValue == null ? null : String(c.oldValue), c.newValue == null ? null : String(c.newValue));
  }
}
async function createTask(data, actor) {
  if (actor.role === 'MEMBER' && data.assignedToId && data.assignedToId !== actor.id) {
    const e = new Error('Members can only create tasks assigned to themselves'); e.status = 403; throw e;
  }
  if (data.assignedToId && !store.userById(data.assignedToId)) { const e = new Error('assignedToId does not match any user'); e.status = 400; throw e; }
  if (data.projectId && !store.projectById(data.projectId)) { const e = new Error('projectId does not match any project'); e.status = 400; throw e; }
  const task = store.createTask({ ...data, createdById: actor.id });
  await writeAudit(task.id, actor.id, [{ field: 'created', oldValue: null, newValue: task.title }]);
  if (task.assignedTo && task.assignedTo.id !== actor.id) {
    await sendMail({ to: task.assignedTo.email, subject: 'New task assigned: ' + task.title,
      text: 'Hi ' + task.assignedTo.name + ',\n\nYou were assigned the task "' + task.title + '" (priority ' + task.priority + ').\n' });
  }
  return task;
}
async function updateTask(id, data, actor) {
  const existing = store.taskRow(id);
  if (!existing) { const e = new Error('Task not found'); e.status = 404; throw e; }
  if (actor.role === 'MEMBER') {
    if (existing.assignedToId !== actor.id) { const e = new Error('Members can only update their own tasks'); e.status = 403; throw e; }
    if (data.assignedToId !== undefined) { const e = new Error('Members cannot reassign tasks'); e.status = 403; throw e; }
  }
  if (data.status && !canTransition(existing.status, data.status)) {
    const e = new Error('Invalid status transition: ' + existing.status + ' -> ' + data.status); e.status = 400; throw e;
  }
  const changes = [];
  for (const field of ['title', 'description', 'status', 'priority', 'assignedToId', 'projectId']) {
    if (data[field] !== undefined) changes.push({ field, oldValue: existing[field], newValue: data[field] });
  }
  if (data.dueDate !== undefined) changes.push({ field: 'dueDate', oldValue: existing.dueDate, newValue: data.dueDate ? new Date(data.dueDate).toISOString() : null });
  const updated = store.updateTask(id, data);
  await writeAudit(id, actor.id, changes);
  return updated;
}
async function listTasks(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const db = store.db;
  const where = [], params = [];
  if (query.status) { where.push('status = ?'); params.push(query.status); }
  if (query.priority) { where.push('priority = ?'); params.push(query.priority); }
  if (query.assignedToId) { where.push('assignedToId = ?'); params.push(parseInt(query.assignedToId, 10)); }
  if (query.projectId) { where.push('projectId = ?'); params.push(parseInt(query.projectId, 10)); }
  if (query.search) { where.push('(title LIKE ? OR description LIKE ?)'); params.push('%' + query.search + '%', '%' + query.search + '%'); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortBy = ['createdAt', 'dueDate', 'priority', 'title'].includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  // Priority is text, so sort by its real rank instead of alphabetically.
  const orderExpr = sortBy === 'priority'
    ? "CASE priority WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'URGENT' THEN 4 END"
    : `"${sortBy}"`;
  const total = db.prepare(`SELECT COUNT(*) as c FROM "Task" ${whereSql}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM "Task" ${whereSql} ORDER BY ${orderExpr} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
  return { data: rows.map((r) => store.taskWithRelations(r)), page, limit, total, totalPages: Math.ceil(total / limit) };
}
async function dashboard() {
  const db = store.db; const now = new Date().toISOString();
  const byStatus = db.prepare('SELECT status, COUNT(*) as c FROM "Task" GROUP BY status').all();
  const byPriority = db.prepare('SELECT priority, COUNT(*) as c FROM "Task" GROUP BY priority').all();
  const overdue = db.prepare('SELECT COUNT(*) as c FROM "Task" WHERE dueDate < ? AND status != \'DONE\'').get(now).c;
  const total = db.prepare('SELECT COUNT(*) as c FROM "Task"').get().c;
  return { total, overdue, byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.c])), byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.c])) };
}
module.exports = { createTask, updateTask, listTasks, dashboard };
