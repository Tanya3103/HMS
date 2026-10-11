require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');

// Import Models
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');

async function seedDatabase(shouldExit = false) {
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`🌱 CarePulse HMS - Database Seeder Initializing...`);
  console.log(`======================================================`);

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    console.log(`[Seeder] Purging existing database collections...`);
    await Promise.all([
      User.deleteMany({}),
      PatientProfile.deleteMany({}),
      DoctorProfile.deleteMany({}),
      Appointment.deleteMany({}),
      MedicalRecord.deleteMany({}),
      RefreshToken.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log(`[Seeder] Hashing credentials with bcrypt (work factor 12)...`);
    const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
    const doctorPasswordHash = await bcrypt.hash('Doctor@123', 12);
    const staffPasswordHash = await bcrypt.hash('Staff@123', 12);
    const patientPasswordHash = await bcrypt.hash('Patient@123', 12);

    // -----------------------------------------------------------------
    // 1. Create Core Users
    // -----------------------------------------------------------------
    console.log(`[Seeder] Inserting user identities across 4 RBAC roles...`);
    
    // Admin User
    const adminUser = await User.create({
      email: 'admin@carepulse.local',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true
    });

    // Staff User (Front Desk Lead)
    const staffUser = await User.create({
      email: 'staff.elena@carepulse.local',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      isActive: true
    });

    // Doctor Users
    const doctorUser1 = await User.create({
      email: 'doctor.rajesh@carepulse.local',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      isActive: true
    });

    const doctorUser2 = await User.create({
      email: 'doctor.sarah@carepulse.local',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      isActive: true
    });

    const doctorUser3 = await User.create({
      email: 'doctor.david@carepulse.local',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      isActive: true
    });

    // Patient Users
    const patientUser1 = await User.create({
      email: 'patient.sarah@carepulse.local',
      passwordHash: patientPasswordHash,
      role: 'PATIENT',
      isActive: true
    });

    const patientUser2 = await User.create({
      email: 'patient.john@carepulse.local',
      passwordHash: patientPasswordHash,
      role: 'PATIENT',
      isActive: true
    });

    const patientUser3 = await User.create({
      email: 'patient.robert@carepulse.local',
      passwordHash: patientPasswordHash,
      role: 'PATIENT',
      isActive: true
    });

    // -----------------------------------------------------------------
    // 2. Create Doctor Profiles
    // -----------------------------------------------------------------
    console.log(`[Seeder] Creating doctor clinic profiles & schedules...`);
    
    const docRajesh = await DoctorProfile.create({
      userId: doctorUser1._id,
      fullName: 'Dr. Rajesh Kumar',
      licenseNumber: 'MED-REG-74921',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      roomNumber: 'Room 301',
      workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      slotDurationMinutes: 30,
      workingHours: { startTime: '09:00', endTime: '16:00' },
      consultationFee: 75,
      isAvailable: true
    });

    const docSarah = await DoctorProfile.create({
      userId: doctorUser2._id,
      fullName: 'Dr. Sarah Jenkins',
      licenseNumber: 'MED-REG-83910',
      department: 'Pediatrics',
      specialization: 'Pediatric Care & Neonatology',
      roomNumber: 'Room 204',
      workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      slotDurationMinutes: 30,
      workingHours: { startTime: '09:00', endTime: '15:00' },
      consultationFee: 65,
      isAvailable: true
    });

    const docDavid = await DoctorProfile.create({
      userId: doctorUser3._id,
      fullName: 'Dr. David Miller',
      licenseNumber: 'MED-REG-99124',
      department: 'General Medicine',
      specialization: 'Internal Medicine & Triage',
      roomNumber: 'Room 105',
      workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      slotDurationMinutes: 20,
      workingHours: { startTime: '08:30', endTime: '17:00' },
      consultationFee: 50,
      isAvailable: true
    });

    // -----------------------------------------------------------------
    // 3. Create Patient Profiles
    // -----------------------------------------------------------------
    console.log(`[Seeder] Creating patient demographics & medical record numbers...`);

    const patSarah = await PatientProfile.create({
      userId: patientUser1._id,
      mrn: 'MRN-2026-0001',
      fullName: 'Sarah Connor',
      phone: '+1 (555) 234-5678',
      dateOfBirth: new Date('1992-06-15'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      allergies: ['Penicillin', 'Peanuts'],
      emergencyContact: {
        name: 'John Connor',
        relationship: 'Son',
        phone: '+1 (555) 876-5432'
      },
      address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62704'
      }
    });

    const patJohn = await PatientProfile.create({
      userId: patientUser2._id,
      mrn: 'MRN-2026-0002',
      fullName: 'John Doe',
      phone: '+1 (555) 345-6789',
      dateOfBirth: new Date('1984-11-20'),
      gender: 'MALE',
      bloodGroup: 'B+',
      allergies: ['Sulfa Drugs'],
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+1 (555) 987-6543'
      },
      address: {
        street: '123 Baker Street',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001'
      }
    });

    const patRobert = await PatientProfile.create({
      userId: patientUser3._id,
      mrn: 'MRN-2026-0003',
      fullName: 'Robert Frost',
      phone: '+1 (555) 456-7890',
      dateOfBirth: new Date('1970-03-26'),
      gender: 'MALE',
      bloodGroup: 'O+',
      allergies: [],
      emergencyContact: {
        name: 'Elinor Frost',
        relationship: 'Daughter',
        phone: '+1 (555) 543-2109'
      },
      address: {
        street: '45 Woods Way',
        city: 'Concord',
        state: 'NH',
        zipCode: '03301'
      }
    });

    // -----------------------------------------------------------------
    // 4. Create Realistic Live Appointments
    // -----------------------------------------------------------------
    console.log(`[Seeder] Populating daily appointment queue and schedules...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appt1 = await Appointment.create({
      patientId: patSarah._id,
      doctorId: docRajesh._id,
      appointmentDate: today,
      timeSlot: '09:00',
      status: 'IN_CONSULTATION',
      reason: 'Routine hypertension follow-up and ECG review',
      queueNumber: 1,
      checkInTime: new Date(Date.now() - 45 * 60 * 1000)
    });

    const appt2 = await Appointment.create({
      patientId: patJohn._id,
      doctorId: docRajesh._id,
      appointmentDate: today,
      timeSlot: '09:30',
      status: 'CHECKED_IN',
      reason: 'Chest tightness following moderate exertion',
      queueNumber: 2,
      checkInTime: new Date(Date.now() - 15 * 60 * 1000)
    });

    const appt3 = await Appointment.create({
      patientId: patRobert._id,
      doctorId: docRajesh._id,
      appointmentDate: today,
      timeSlot: '10:00',
      status: 'SCHEDULED',
      reason: 'Annual cardiovascular risk screening',
      queueNumber: 3
    });

    const appt4 = await Appointment.create({
      patientId: patSarah._id,
      doctorId: docSarah._id,
      appointmentDate: today,
      timeSlot: '11:00',
      status: 'SCHEDULED',
      reason: 'Pediatric consultation for child vaccination',
      queueNumber: 1
    });

    // Completed appointment with historical record
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    pastDate.setHours(0, 0, 0, 0);

    const apptCompleted = await Appointment.create({
      patientId: patSarah._id,
      doctorId: docRajesh._id,
      appointmentDate: pastDate,
      timeSlot: '14:00',
      status: 'COMPLETED',
      reason: 'Initial consultation for elevated blood pressure',
      queueNumber: 5,
      checkInTime: pastDate,
      completedTime: new Date(pastDate.getTime() + 40 * 60 * 1000)
    });

    // -----------------------------------------------------------------
    // 5. Create Historical Medical Records (EMR Encounters)
    // -----------------------------------------------------------------
    console.log(`[Seeder] Inserting longitudinal EMR encounters and e-prescriptions...`);

    await MedicalRecord.create({
      patientId: patSarah._id,
      doctorId: docRajesh._id,
      appointmentId: apptCompleted._id,
      recordDate: pastDate,
      vitals: {
        bloodPressure: '138/88',
        pulseRate: 76,
        temperature: 98.4,
        weightKg: 64.2,
        spO2: 99
      },
      symptoms: ['Occasional morning occipital headache', 'Mild fatigue'],
      diagnosis: 'Stage 1 Essential Hypertension (Primary)',
      clinicalNotes: 'Patient advised on dietary sodium reduction (< 2g/day) and 30 minutes daily aerobic exercise. Commenced low-dose antihypertensive therapy. Follow-up ECG scheduled.',
      prescriptions: [
        {
          medicineName: 'Amlodipine Besylate',
          dosage: '5mg',
          frequency: 'Once Daily',
          duration: '30 days',
          instructions: 'Take in morning with water'
        },
        {
          medicineName: 'CoQ10 Supplement',
          dosage: '100mg',
          frequency: 'Once Daily',
          duration: '60 days',
          instructions: 'Take post breakfast'
        }
      ]
    });

    // -----------------------------------------------------------------
    // 6. Log Initial Audit Entry
    // -----------------------------------------------------------------
    await AuditLog.create({
      actorId: adminUser._id,
      actorRole: 'ADMIN',
      action: 'SYSTEM_DATABASE_SEEDED',
      resourceType: 'SYSTEM',
      details: { environment: 'localhost', seedScript: 'seed.js' }
    });

    const elapsed = Date.now() - startTime;

    console.log(`\n======================================================`);
    console.log(`✅ CarePulse Database Seeded Successfully in ${elapsed}ms!`);
    console.log(`======================================================`);
    console.log(`\nDemo Credentials for Localhost Testing:`);
    console.table([
      { Role: 'ADMIN', Email: 'admin@carepulse.local', Password: 'Admin@123', Portal: '/admin/overview' },
      { Role: 'DOCTOR', Email: 'doctor.rajesh@carepulse.local', Password: 'Doctor@123', Portal: '/doctor/dashboard' },
      { Role: 'DOCTOR', Email: 'doctor.sarah@carepulse.local', Password: 'Doctor@123', Portal: '/doctor/dashboard' },
      { Role: 'STAFF', Email: 'staff.elena@carepulse.local', Password: 'Staff@123', Portal: '/staff/appointments' },
      { Role: 'PATIENT', Email: 'patient.sarah@carepulse.local', Password: 'Patient@123', Portal: '/patient/dashboard' },
      { Role: 'PATIENT', Email: 'patient.john@carepulse.local', Password: 'Patient@123', Portal: '/patient/dashboard' }
    ]);
    console.log(`======================================================\n`);

    if (shouldExit) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error(`[Seeder Error] Failed to seed database:`, error);
    if (shouldExit) {
      await disconnectDB();
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seedDatabase(true);
}

module.exports = { seedDatabase };
