const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientProfile',
    required: [true, 'Patient ID is required'],
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorProfile',
    required: [true, 'Doctor ID is required'],
    index: true
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required'],
    index: true
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED',
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'Routine clinical consultation'
  },
  queueNumber: {
    type: Number,
    default: 1
  },
  checkInTime: {
    type: Date,
    default: null
  },
  completedTime: {
    type: Date,
    default: null
  },
  cancelledReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// -------------------------------------------------------------
// High-Performance Indexing Strategy (Core Benchmark Driver)
// -------------------------------------------------------------

// 1. Anti-collision lock: Guarantees no two bookings share doctor, date, and slot
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  { unique: true, name: 'idx_doctor_slot_unique' }
);

// 2. Doctor Dashboard Queue Index (Sub-40ms queue retrieval)
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, status: 1 },
  { name: 'idx_doctor_daily_queue' }
);

// 3. Patient Appointment Timeline Index
appointmentSchema.index(
  { patientId: 1, appointmentDate: -1 },
  { name: 'idx_patient_appointment_history' }
);

// 4. Staff Daily Triage Filter Index
appointmentSchema.index(
  { appointmentDate: 1, status: 1 },
  { name: 'idx_staff_daily_triage' }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
