const express = require('express');
const { getDoctors, searchPatients, registerWalkIn } = require('../controllers/staffController');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// Public doctor directory
router.get('/doctors', getDoctors);

// Authenticated staff endpoints
router.use(authenticateJWT);
router.get('/patients/search', authorizeRoles('STAFF', 'ADMIN', 'DOCTOR'), searchPatients);
router.post('/patients/walkin', authorizeRoles('STAFF', 'ADMIN'), registerWalkIn);

module.exports = router;
