const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');

/**
 * Controller: Get List of Active Doctors with Specialization & Room
 */
async function getDoctors(req, res) {
  try {
    const doctors = await DoctorProfile.find({ isAvailable: true })
      .select('fullName department specialization roomNumber workingDays workingHours consultationFee')
      .lean();

    res.status(200).json({
      success: true,
      data: { doctors }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Fast Patient Directory Search (Staff Triage)
 */
async function searchPatients(req, res) {
  try {
    const { query } = req.query;
    let filter = {};

    if (query && query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      filter = {
        $or: [
          { fullName: regex },
          { phone: regex },
          { mrn: regex }
        ]
      };
    }

    const patients = await PatientProfile.find(filter)
      .limit(50)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { count: patients.length, patients }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Register Walk-In Patient & Immediately Book (Staff Desk)
 */
async function registerWalkIn(req, res) {
  try {
    const {
      fullName,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      doctorId,
      timeSlot,
      reason
    } = req.body;

    if (!fullName || !phone || !doctorId || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DATA', message: 'Name, phone, doctor, and slot are required' }
      });
    }

    // Check if patient already exists by phone
    let patient = await PatientProfile.findOne({ phone });

    if (!patient) {
      // Create guest user record
      const tempEmail = `walkin.${Date.now()}@carepulse.local`;
      const tempHash = await bcrypt.hash('CarePulseWalkIn123', 10);
      const user = await User.create({
        email: tempEmail,
        passwordHash: tempHash,
        role: 'PATIENT'
      });

      const count = await PatientProfile.countDocuments();
      const year = new Date().getFullYear();
      const mrn = `MRN-${year}-${String(count + 1).padStart(4, '0')}`;

      patient = await PatientProfile.create({
        userId: user._id,
        mrn,
        fullName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01'),
        gender: gender || 'OTHER',
        bloodGroup: bloodGroup || null
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Book slot with status CHECKED_IN
    const countToday = await Appointment.countDocuments({
      doctorId,
      appointmentDate: today
    });

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      appointmentDate: today,
      timeSlot,
      status: 'CHECKED_IN',
      checkInTime: new Date(),
      reason: reason || 'Walk-In Consultation',
      queueNumber: countToday + 1
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'fullName phone mrn bloodGroup')
      .populate('doctorId', 'fullName department roomNumber')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Walk-in patient registered and checked in to clinic queue.',
      data: { appointment: populated }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'SLOT_COLLISION', message: 'The selected time slot is already booked for this doctor.' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'WALKIN_ERROR', message: err.message }
    });
  }
}

module.exports = {
  getDoctors,
  searchPatients,
  registerWalkIn
};
