const taskService = require('../services/taskService');
const store = require('../config/store');
const asyncHandler = require('../middleware/asyncHandler');
const getDashboard = asyncHandler(async (req, res) => { res.json(await taskService.dashboard()); });
const exportReport = asyncHandler(async (req, res) => {
  const tasks = store.db.prepare('SELECT t.*, u.name as assigneeName, p.name as projectName FROM "Task" t LEFT JOIN "User" u ON u.id = t.assignedToId LEFT JOIN "Project" p ON p.id = t.projectId ORDER BY t.createdAt DESC').all();
  if (req.query.format === 'csv') {
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const header = 'id,title,status,priority,dueDate,assignee,project\n';
    const rows = tasks.map((t) => [t.id, t.title, t.status, t.priority, t.dueDate ? t.dueDate.slice(0, 10) : '', t.assigneeName || '', t.projectName || ''].map(esc).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="team-report.csv"');
    return res.send(header + rows);
  }
  res.json({ tasks });
});
module.exports = { getDashboard, exportReport };
