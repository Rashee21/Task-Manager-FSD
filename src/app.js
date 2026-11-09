require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const app = express();
app.use(cors());
app.use(express.json());
// Serves the web frontend (public/index.html) from the same server.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'task-manager-api' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
