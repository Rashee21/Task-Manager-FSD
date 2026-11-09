const Joi = require('joi');
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(100).required(),
});
const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(100).required(),
  role: Joi.string().valid('ADMIN', 'MANAGER', 'MEMBER').default('MEMBER'),
});
const projectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).allow('', null),
});
const taskCreateSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE').default('TODO'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
  dueDate: Joi.date().iso().allow(null),
  projectId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  tags: Joi.array().items(Joi.string().min(1).max(50)).default([]),
});
const taskUpdateSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
  dueDate: Joi.date().iso().allow(null),
  projectId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  tags: Joi.array().items(Joi.string().min(1).max(50)),
}).min(1);
module.exports = { registerSchema, loginSchema, createUserSchema, projectSchema, taskCreateSchema, taskUpdateSchema };
