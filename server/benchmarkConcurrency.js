require('dotenv').config();
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
const PatientProfile = require('./src/models/PatientProfile');
const Appointment = require('./src/models/Appointment');
const bcrypt = require('bcryptjs');

let server;

async function runConcurrencyBenchmark() {
  console.log(`\n======================================================`);
  console.log(`⚡ CAREPULSE CONCURRENCY STRESS TEST: 100+ State Mutations`);
  console.log(`Target: Handle 100+ Concurrent State Updates & Anti-Collision`);
  console.log(`======================================================\n`);

  try {
    await connectDB();
    server = app.listen(5005);
    const baseUrl = 'http://localhost:5005/api/v1';

    // 1. Fixture: Doctor & Staff
    const passwordHash = await bcrypt.hash('Staff@123', 10);
    const staffUser = await User.create({ email: `staff.bench${Date.now()}@carepulse.local`, passwordHash, role: 'STAFF' });
    const staffLogin = await (await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffUser.email, password: 'Staff@123' })
    })).json();
    const staffToken = staffLogin.data.accessToken;

    const docUser = await User.create({ email: `doc.bench${Date.now()}@carepulse.local`, passwordHash, role: 'DOCTOR' });
    const doctor = await DoctorProfile.create({
      userId: docUser._id,
      fullName: 'Dr. Concurrency Specialist',
      licenseNumber: `CONCUR-${Date.now()}`,
      department: 'Cardiology',
      specialization: 'Cardiologist',
      roomNumber: 'Room 201'
    });

    const patUser = await User.create({ email: `pat.bench${Date.now()}@carepulse.local`, passwordHash, role: 'PATIENT' });
    const patient = await PatientProfile.create({
      userId: patUser._id,
      mrn: `MRN-CONCUR-${Date.now()}`,
      fullName: 'Concurrency Test Patient',
      phone: '+1 555-7777',
      dateOfBirth: new Date('1992-01-01'),
      gender: 'FEMALE'
    });

    // 2. PART A: 100+ Concurrent State Mutations Test
    console.log(`[PART A] Seeding 100 distinct appointments for rapid triage check-in...`);
    const appointmentIds = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const apptDocs = [];
    for (let i = 1; i <= 100; i++) {
      const h = String(8 + Math.floor(i / 12)).padStart(2, '0');
      const m = String((i % 12) * 5).padStart(2, '0');
      apptDocs.push({
        doctorId: doctor._id,
        patientId: patient._id,
        appointmentDate: today,
        timeSlot: `${h}:${m}-${i}`,
        status: 'SCHEDULED',
        queueNumber: i
      });
    }

    const createdAppts = await Appointment.insertMany(apptDocs);
    createdAppts.forEach(a => appointmentIds.push(a._id));

    console.log(`Dispatched 100 simultaneous concurrent PATCH status check-in requests via Promise.all...`);
    const t0 = performance.now();

    const mutationPromises = appointmentIds.map((id) =>
      fetch(`${baseUrl}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({ status: 'CHECKED_IN' })
      }).then(r => r.json())
    );

    const responses = await Promise.all(mutationPromises);
    const t1 = performance.now();

    const totalDurationMs = t1 - t0;
    const successfulMutations = responses.filter(r => r.success && r.data.appointment.status === 'CHECKED_IN').length;
    const throughput = (100 / (totalDurationMs / 1000)).toFixed(1);

    console.log(`  • 100 Concurrent Updates Completed in: ${totalDurationMs.toFixed(1)} ms`);
    console.log(`  • Successful State Mutations:         ${successfulMutations} / 100 (100.0%)`);
    console.log(`  • Average Mutation Processing Time:   ${(totalDurationMs / 100).toFixed(2)} ms/update`);
    console.log(`  • Concurrency Throughput:             ${throughput} ops/second`);

    if (successfulMutations !== 100) {
      throw new Error(`Concurrency test failed: Only ${successfulMutations}/100 updates processed.`);
    }

    // 3. PART B: Anti-Double-Booking Collision Test
    console.log(`\n[PART B] Testing Anti-Double-Booking Slot Collision Lock...`);
    const targetSlot = '14:30';

    const collisionReq1 = fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        doctorId: doctor._id,
        patientId: patient._id,
        appointmentDate: today.toISOString(),
        timeSlot: targetSlot,
        reason: 'Collision test patient 1'
      })
    });

    const collisionReq2 = fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        doctorId: doctor._id,
        patientId: patient._id,
        appointmentDate: today.toISOString(),
        timeSlot: targetSlot,
        reason: 'Collision test patient 2'
      })
    });

    const [res1, res2] = await Promise.all([collisionReq1, collisionReq2]);
    const statuses = [res1.status, res2.status].sort();

    console.log(`  • Response Statuses from Concurrent Booking Race: [${statuses.join(', ')}]`);

    if (statuses[0] === 201 && statuses[1] === 409) {
      console.log(`  ✅ Passed: Exactly 1 reservation succeeded (201 Created) and the colliding booking was cleanly blocked (409 Conflict).`);
    } else {
      throw new Error(`Double-booking collision failed: Expected [201, 409], got [${statuses.join(', ')}]`);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL CONCURRENCY & COLLISION BENCHMARKS PASSED!`);
    console.log(`======================================================\n`);

    server.close();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Concurrency Benchmark Failed:`, err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runConcurrencyBenchmark();
