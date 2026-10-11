const express = require('express');
const { getAdminStats, listUsers, createUser, toggleUserStatus, getAuditLogs } = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
