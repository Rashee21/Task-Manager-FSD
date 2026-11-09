const express = require('express');
const c = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', c.getDashboard);
router.get('/export', c.exportReport);
module.exports = router;
