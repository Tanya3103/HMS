const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  bloodPressure: { type: String, default: null }, // e.g. "120/80"
  pulseRate: { type: Number, default: null },     // bpm
  temperature: { type: Number, default: null },   // Fahrenheit
  weightKg: { type: Number, default: null },      // kg
  spO2: { type: Number, default: null }           // percentage
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'], // e.g. "500mg"
    trim: true
  },
  frequency: {
    type: String,
    enum: ['OD', 'BD', 'TDS', 'QID', 'PRN', 'Once Daily', 'Twice Daily', 'Three Times Daily', 'As Needed'],
    default: 'OD'
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'], // e.g. "5 days", "1 month"
    trim: true
  },
  instructions: {
    type: String,
    default: '',
    trim: true
  }
}, { _id: true });

const medicalRecordSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required'],
    unique: true
  },
  recordDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  vitals: {
    type: vitalsSchema,
    default: () => ({})
  },
  symptoms: {
    type: [String],
    default: []
  },
  diagnosis: {
    type: String,
    required: [true, 'Clinical diagnosis is required'],
    trim: true,
    index: true
  },
  clinicalNotes: {
    type: String,
    default: '',
    trim: true
  },
  prescriptions: {
    type: [prescriptionSchema],
    default: []
  }
}, {
  timestamps: true
});

// Longitudinal Patient Clinical History Index (Sub-50ms EMR drawer retrieval)
medicalRecordSchema.index(
  { patientId: 1, recordDate: -1 },
  { name: 'idx_patient_emr_timeline' }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
