const express = require('express');
const {
  getAvailableSlots,
  bookAppointment,
  getDoctorQueue,
  listAppointments,
  getMyPatientAppointments,
  updateAppointmentStatus
} = require('../controllers/appointmentController');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// All appointment routes require authentication
router.use(authenticateJWT);

// Available slots for doctor booking
router.get('/available-slots', getAvailableSlots);

// Patient personal appointments
router.get('/patient/my', authorizeRoles('PATIENT'), getMyPatientAppointments);

// Doctor clinic queue
router.get('/doctor/queue', authorizeRoles('DOCTOR'), getDoctorQueue);

// Master list / filter (Staff & Admin)
router.get('/', authorizeRoles('STAFF', 'ADMIN', 'DOCTOR'), listAppointments);

// Book appointment
router.post('/', authorizeRoles('PATIENT', 'STAFF', 'ADMIN'), bookAppointment);

// Update status
router.patch('/:id/status', authorizeRoles('PATIENT', 'STAFF', 'DOCTOR', 'ADMIN'), updateAppointmentStatus);

module.exports = router;
