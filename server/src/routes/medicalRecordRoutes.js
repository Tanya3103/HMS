const express = require('express');
const { getPatientHistory, createEncounter } = require('../controllers/medicalRecordController');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { checkRecordOwnership } = require('../middleware/ownershipGuard');

const router = express.Router();

router.use(authenticateJWT);

// Longitudinal patient history (Doctor, Patient self, Admin)
// Staff is rejected by checkRecordOwnership
router.get('/patient/:patientId', checkRecordOwnership, getPatientHistory);

// Author clinical encounter (Doctor only)
router.post('/', authorizeRoles('DOCTOR'), createEncounter);

module.exports = router;
