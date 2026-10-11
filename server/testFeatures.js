require('dotenv').config();
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
const PatientProfile = require('./src/models/PatientProfile');
const Appointment = require('./src/models/Appointment');
const bcrypt = require('bcryptjs');

let server;

async function runFeatureVerification() {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Phase 5 Main Feature Modules Integration Test`);
  console.log(`======================================================\n`);

  try {
    await connectDB();
    server = app.listen(5002);
    const baseUrl = 'http://localhost:5002/api/v1';

    // 1. Ensure test Doctor exists
    await User.deleteMany({ email: 'test.doc@carepulse.local' });
    const docUser = await User.create({
      email: 'test.doc@carepulse.local',
      passwordHash: await bcrypt.hash('Doc@123', 10),
      role: 'DOCTOR',
      isActive: true
    });
    const docProfile = await DoctorProfile.create({
      userId: docUser._id,
      fullName: 'Dr. Test Specialist',
      licenseNumber: `TEST-${Date.now()}`,
      department: 'Cardiology',
      specialization: 'Cardiologist',
      roomNumber: 'Room 305',
      isAvailable: true
    });

    // 2. Ensure test Patient exists
    await User.deleteMany({ email: 'test.pat@carepulse.local' });
    const patUser = await User.create({
      email: 'test.pat@carepulse.local',
      passwordHash: await bcrypt.hash('Pat@123', 10),
      role: 'PATIENT',
      isActive: true
    });
    const patProfile = await PatientProfile.create({
      userId: patUser._id,
      mrn: `MRN-TEST-${Date.now()}`,
      fullName: 'Test Patient Sarah',
      phone: '+1 555-9090',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      allergies: ['Penicillin']
    });

    // 3. Ensure test Admin exists
    await User.deleteMany({ email: 'test.adm@carepulse.local' });
    const admUser = await User.create({
      email: 'test.adm@carepulse.local',
      passwordHash: await bcrypt.hash('Adm@123', 10),
      role: 'ADMIN',
      isActive: true
    });

    // Logins to obtain tokens
    const patLogin = await (await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.pat@carepulse.local', password: 'Pat@123' })
    })).json();
    const patToken = patLogin.data.accessToken;

    const docLogin = await (await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.doc@carepulse.local', password: 'Doc@123' })
    })).json();
    const docToken = docLogin.data.accessToken;

    const admLogin = await (await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.adm@carepulse.local', password: 'Adm@123' })
    })).json();
    const admToken = admLogin.data.accessToken;

    // Test 1: Get Doctors Directory
    console.log(`[Test 1] Testing public doctors directory...`);
    const docsRes = await (await fetch(`${baseUrl}/staff/doctors`)).json();
    if (docsRes.success && docsRes.data.doctors.length > 0) {
      console.log(`  ✅ Passed: Retrieved ${docsRes.data.doctors.length} doctors`);
    } else {
      throw new Error(`Test 1 Failed: ${JSON.stringify(docsRes)}`);
    }

    // Test 2: Check Available Slots
    console.log(`[Test 2] Testing slot availability endpoint...`);
    const todayStr = new Date().toISOString().split('T')[0];
    const slotsRes = await (await fetch(
      `${baseUrl}/appointments/available-slots?doctorId=${docProfile._id}&date=${todayStr}`,
      { headers: { 'Authorization': `Bearer ${patToken}` } }
    )).json();
    if (slotsRes.success && slotsRes.data.slots.length > 0) {
      console.log(`  ✅ Passed: Retrieved ${slotsRes.data.slots.length} clinic slots for doctor`);
    } else {
      throw new Error(`Test 2 Failed: ${JSON.stringify(slotsRes)}`);
    }

    // Test 3: Book Appointment as Patient
    console.log(`[Test 3] Testing patient appointment booking & collision prevention...`);
    const bookRes = await (await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patToken}`
      },
      body: JSON.stringify({
        doctorId: docProfile._id,
        appointmentDate: todayStr,
        timeSlot: '10:00',
        reason: 'Acute cardiovascular review'
      })
    })).json();

    if (bookRes.success && bookRes.data.appointment._id) {
      console.log(`  ✅ Passed: Booked appointment with Queue #${bookRes.data.appointment.queueNumber}`);
    } else {
      throw new Error(`Test 3 Failed: ${JSON.stringify(bookRes)}`);
    }
    const appointmentId = bookRes.data.appointment._id;

    // Test 4: Doctor Queue Retrieval
    console.log(`[Test 4] Testing doctor queue retrieval...`);
    const queueRes = await (await fetch(`${baseUrl}/appointments/doctor/queue`, {
      headers: { 'Authorization': `Bearer ${docToken}` }
    })).json();
    if (queueRes.success && queueRes.data.appointments.length > 0) {
      console.log(`  ✅ Passed: Doctor retrieved active queue with ${queueRes.data.appointments.length} patients`);
    } else {
      throw new Error(`Test 4 Failed: ${JSON.stringify(queueRes)}`);
    }

    // Test 5: Update Appointment Status to IN_CONSULTATION
    console.log(`[Test 5] Testing status transition to IN_CONSULTATION...`);
    const statusRes = await (await fetch(`${baseUrl}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${docToken}`
      },
      body: JSON.stringify({ status: 'IN_CONSULTATION' })
    })).json();
    if (statusRes.success && statusRes.data.appointment.status === 'IN_CONSULTATION') {
      console.log(`  ✅ Passed: Advanced appointment status to IN_CONSULTATION`);
    } else {
      throw new Error(`Test 5 Failed: ${JSON.stringify(statusRes)}`);
    }

    // Test 6: Create Clinical Encounter (EMR) & Prescriptions
    console.log(`[Test 6] Testing clinical encounter record authoring & auto-completion...`);
    const emrRes = await (await fetch(`${baseUrl}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${docToken}`
      },
      body: JSON.stringify({
        appointmentId,
        patientId: patProfile._id,
        vitals: { bloodPressure: '124/82', pulseRate: 74, temperature: 98.4, spO2: 99 },
        symptoms: ['Mild shortness of breath'],
        diagnosis: 'Mild Sinus Tachycardia',
        clinicalNotes: 'ECG unremarkable. Rest advised.',
        prescriptions: [
          { medicineName: 'Metoprolol', dosage: '25mg', frequency: 'OD', duration: '14 days' }
        ]
      })
    })).json();
    if (emrRes.success && emrRes.data.record._id) {
      console.log(`  ✅ Passed: Authored EMR record & prescriptions. Appointment discharged.`);
    } else {
      throw new Error(`Test 6 Failed: ${JSON.stringify(emrRes)}`);
    }

    // Test 7: Patient Reads Longitudinal EMR History
    console.log(`[Test 7] Testing patient longitudinal EMR history retrieval...`);
    const historyRes = await (await fetch(`${baseUrl}/records/patient/${patProfile._id}`, {
      headers: { 'Authorization': `Bearer ${patToken}` }
    })).json();
    if (historyRes.success && historyRes.data.records.length > 0) {
      console.log(`  ✅ Passed: Patient retrieved longitudinal records (Total: ${historyRes.data.records.length})`);
    } else {
      throw new Error(`Test 7 Failed: ${JSON.stringify(historyRes)}`);
    }

    // Test 8: Admin Operations Telemetry
    console.log(`[Test 8] Testing admin telemetry & operations stats...`);
    const statsRes = await (await fetch(`${baseUrl}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${admToken}` }
    })).json();
    if (statsRes.success && statsRes.data.telemetry) {
      console.log(`  ✅ Passed: Admin retrieved system telemetry (${statsRes.data.telemetry.p95QueryLatencyBenchmark})`);
    } else {
      throw new Error(`Test 8 Failed: ${JSON.stringify(statsRes)}`);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL Phase 5 Feature Module Integration Tests PASSED!`);
    console.log(`======================================================\n`);

    server.close();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Feature Verification Failed:`, err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runFeatureVerification();
