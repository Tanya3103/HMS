const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const AuditLog = require('../models/AuditLog');

/**
 * Helper: Generate standard 30-min slots between start & end time
 */
function generateTimeSlots(startTime = '09:00', endTime = '17:00', slotDuration = 30) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const finish = endHour * 60 + endMin;

  while (current + slotDuration <= finish) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(timeString);
    current += slotDuration;
  }

  return slots;
}

/**
 * Controller: Get Available Slots for a Doctor on a Specific Date
 */
async function getAvailableSlots(req, res) {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'doctorId and date are required' }
      });
    }

    const doctor = await DoctorProfile.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' }
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get all booked appointments for this doctor on this day
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: targetDate,
      status: { $ne: 'CANCELLED' }
    }).select('timeSlot').lean();

    const bookedSlotsSet = new Set(bookedAppointments.map(a => a.timeSlot));

    // Generate slots
    const allSlots = generateTimeSlots(
      doctor.workingHours?.startTime || '09:00',
      doctor.workingHours?.endTime || '17:00',
      doctor.slotDurationMinutes || 30
    );

    const slotDetails = allSlots.map(timeSlot => ({
      timeSlot,
      isAvailable: !bookedSlotsSet.has(timeSlot)
    }));

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        date: targetDate.toISOString(),
        slots: slotDetails
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Book an Appointment (Anti-Collision Protected)
 */
async function bookAppointment(req, res) {
  try {
    const { doctorId, appointmentDate, timeSlot, reason, patientId: inputPatientId } = req.body;

    // Resolve patientId: if role is PATIENT, strictly enforce own profileId
    let patientId = req.user.profileId;
    if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') {
      patientId = inputPatientId;
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PATIENT_REQUIRED', message: 'Patient profile reference is required' }
      });
    }

    const targetDate = new Date(appointmentDate);
    targetDate.setHours(0, 0, 0, 0);

    // 1. Check for collision before insert
    const collision = await Appointment.findOne({
      doctorId,
      appointmentDate: targetDate,
      timeSlot,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (collision) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_COLLISION',
          message: 'This time slot is already booked. Please choose another available slot.'
        }
      });
    }

    // 2. Determine daily queue serial number
    const dailyCount = await Appointment.countDocuments({
      doctorId,
      appointmentDate: targetDate
    });

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate: targetDate,
      timeSlot,
      reason: reason || 'Routine Clinical Consultation',
      queueNumber: dailyCount + 1,
      status: 'SCHEDULED'
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'fullName phone mrn bloodGroup')
      .populate('doctorId', 'fullName department roomNumber')
      .lean();

    // Audit log
    await AuditLog.create({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'APPOINTMENT_BOOKED',
      resourceType: 'APPOINTMENT',
      resourceId: appointment._id,
      details: { doctorId, patientId, timeSlot, date: targetDate }
    });

    res.status(201).json({
      success: true,
      message: 'Appointment successfully booked.',
      data: { appointment: populated }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_COLLISION',
          message: 'Concurrent booking conflict: This slot was just reserved by another patient.'
        }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'BOOKING_FAILED', message: err.message }
    });
  }
}

/**
 * Controller: Get Doctor's Real-Time Daily Queue (Sub-40ms Lean Query)
 */
async function getDoctorQueue(req, res) {
  try {
    const doctorId = req.user.profileId;
    if (!doctorId) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DOCTOR', message: 'Only doctor accounts can access clinic queue' }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: today
    })
      .sort({ queueNumber: 1, timeSlot: 1 })
      .populate('patientId', 'fullName phone mrn bloodGroup allergies gender dateOfBirth')
      .lean();

    // Summarize queue metrics
    const stats = {
      totalToday: appointments.length,
      waiting: appointments.filter(a => a.status === 'CHECKED_IN').length,
      inConsultation: appointments.filter(a => a.status === 'IN_CONSULTATION').length,
      completed: appointments.filter(a => a.status === 'COMPLETED').length
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        appointments
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'QUEUE_FETCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: List Appointments with Filters (Staff Master Grid)
 */
async function listAppointments(req, res) {
  try {
    const { date, doctorId, status, search } = req.query;
    const query = {};

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      query.appointmentDate = targetDate;
    }

    if (doctorId && doctorId !== 'ALL') {
      query.doctorId = doctorId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    let appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, timeSlot: 1 })
      .populate('patientId', 'fullName phone mrn bloodGroup')
      .populate('doctorId', 'fullName department roomNumber')
      .lean();

    // In-memory filter for search term if supplied
    if (search && search.trim()) {
      const term = search.toLowerCase();
      appointments = appointments.filter(a =>
        a.patientId?.fullName?.toLowerCase().includes(term) ||
        a.patientId?.phone?.includes(term) ||
        a.patientId?.mrn?.toLowerCase().includes(term) ||
        a.doctorId?.fullName?.toLowerCase().includes(term)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        count: appointments.length,
        appointments
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Get Patient's Personal Appointments
 */
async function getMyPatientAppointments(req, res) {
  try {
    const patientId = req.user.profileId;
    if (!patientId) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_PATIENT', message: 'Only patient accounts can access personal bookings' }
      });
    }

    const appointments = await Appointment.find({ patientId })
      .sort({ appointmentDate: -1, timeSlot: 1 })
      .populate('doctorId', 'fullName department roomNumber consultationFee')
      .lean();

    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Update Appointment Status (Check-In, In-Consultation, Complete, Cancel)
 */
async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, cancelledReason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found' }
      });
    }

    // Role-based status transition checks
    if (req.user.role === 'PATIENT') {
      if (status !== 'CANCELLED') {
        return res.status(403).json({
          success: false,
          error: { code: 'UNAUTHORIZED_STATUS_CHANGE', message: 'Patients may only cancel their bookings.' }
        });
      }
    }

    appointment.status = status;
    if (status === 'CHECKED_IN') {
      appointment.checkInTime = new Date();
    } else if (status === 'COMPLETED') {
      appointment.completedTime = new Date();
    } else if (status === 'CANCELLED') {
      appointment.cancelledReason = cancelledReason || 'Cancelled by user';
    }

    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate('patientId', 'fullName phone mrn bloodGroup')
      .populate('doctorId', 'fullName department roomNumber')
      .lean();

    // Audit log status mutation
    await AuditLog.create({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: `APPOINTMENT_${status}`,
      resourceType: 'APPOINTMENT',
      resourceId: appointment._id,
      details: { newStatus: status, previousStatus: appointment.status }
    });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}`,
      data: { appointment: updated }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: err.message }
    });
  }
}

module.exports = {
  getAvailableSlots,
  bookAppointment,
  getDoctorQueue,
  listAppointments,
  getMyPatientAppointments,
  updateAppointmentStatus
};
