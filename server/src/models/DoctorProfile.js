const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '17:00' }
}, { _id: false });

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: [true, 'Doctor full name is required'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License registration number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    index: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true
  },
  workingDays: {
    type: [String],
    default: ['MON', 'TUE', 'WED', 'THU', 'FRI']
  },
  slotDurationMinutes: {
    type: Number,
    default: 30
  },
  workingHours: {
    type: workingHoursSchema,
    default: () => ({ startTime: '09:00', endTime: '17:00' })
  },
  consultationFee: {
    type: Number,
    default: 50
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

doctorProfileSchema.index({ department: 1, isAvailable: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
