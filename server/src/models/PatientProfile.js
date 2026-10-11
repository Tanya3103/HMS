const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, default: null },
  relationship: { type: String, default: null },
  phone: { type: String, default: null }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  street: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' }
}, { _id: false });

const patientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  mrn: {
    type: String,
    required: true,
    uppercase: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
    default: null
  },
  allergies: {
    type: [String],
    default: []
  },
  emergencyContact: {
    type: emergencyContactSchema,
    default: () => ({})
  },
  address: {
    type: addressSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

// Compound and text indexes for rapid receptionist lookup
patientProfileSchema.index({ mrn: 1 }, { unique: true });
patientProfileSchema.index({ phone: 1 });
patientProfileSchema.index({ fullName: 'text' });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
