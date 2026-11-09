const taskService = require('../services/taskService');
const store = require('../config/store');
const asyncHandler = require('../middleware/asyncHandler');
const create = asyncHandler(async (req, res) => { res.status(201).json({ task: await taskService.createTask(req.body, req.user) }); });
const list = asyncHandler(async (req, res) => { res.json(await taskService.listTasks(req.query)); });
const getOne = asyncHandler(async (req, res) => {
  const task = store.taskWithRelations(store.taskRow(parseInt(req.params.id, 10)));
  if (!task) { const e = new Error('Task not found'); e.status = 404; throw e; }
  res.json({ task });
});
const update = asyncHandler(async (req, res) => { res.json({ task: await taskService.updateTask(parseInt(req.params.id, 10), req.body, req.user) }); });
const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!store.taskRow(id)) { const e = new Error('Task not found'); e.status = 404; throw e; }
  store.deleteTask(id); res.json({ message: 'Task deleted' });
});
const audit = asyncHandler(async (req, res) => { res.json({ auditLogs: store.auditForTask(parseInt(req.params.id, 10)) }); });
module.exports = { create, list, getOne, update, remove, audit };
