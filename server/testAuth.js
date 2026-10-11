require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');

let server;

async function runAuthVerification() {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Phase 3 Auth & Security Verification Test`);
  console.log(`======================================================\n`);

  try {
    await connectDB();

    // Ensure test doctor user and profile exist in the active test database
    const bcrypt = require('bcryptjs');
    const User = require('./src/models/User');
    const DoctorProfile = require('./src/models/DoctorProfile');

    await User.deleteMany({ email: 'doctor.rajesh@carepulse.local' });
    const doctorHash = await bcrypt.hash('Doctor@123', 12);
    const docUser = await User.create({
      email: 'doctor.rajesh@carepulse.local',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      isActive: true
    });

    await DoctorProfile.deleteMany({ userId: docUser._id });
    await DoctorProfile.create({
      userId: docUser._id,
      fullName: 'Dr. Rajesh Kumar',
      licenseNumber: 'TEST-MED-74921',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      roomNumber: 'Room 301',
      isAvailable: true
    });

    server = app.listen(5001);
    const baseUrl = 'http://localhost:5001/api/v1/auth';

    // Test 1: Invalid Login
    console.log(`[Test 1] Testing invalid password rejection...`);
    const badLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor.rajesh@carepulse.local', password: 'IncorrectPassword99' })
    });
    const badLoginJson = await badLoginRes.json();
    if (badLoginRes.status === 401 && badLoginJson.error.code === 'INVALID_CREDENTIALS') {
      console.log(`  ✅ Passed: Rejected bad password with 401 INVALID_CREDENTIALS`);
    } else {
      throw new Error(`Test 1 Failed: Expected 401, got ${badLoginRes.status}`);
    }

    // Test 2: Valid Login (Doctor Role)
    console.log(`[Test 2] Testing doctor login and JWT token issuance...`);
    const goodLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor.rajesh@carepulse.local', password: 'Doctor@123' })
    });
    const goodLoginJson = await goodLoginRes.json();
    if (goodLoginRes.status === 200 && goodLoginJson.data.accessToken && goodLoginJson.data.user.role === 'DOCTOR') {
      console.log(`  ✅ Passed: Issued valid JWT Access Token for ${goodLoginJson.data.user.name} (${goodLoginJson.data.user.role})`);
    } else {
      throw new Error(`Test 2 Failed: Expected 200 with token, got ${JSON.stringify(goodLoginJson)}`);
    }

    const { accessToken, refreshToken } = goodLoginJson.data;

    // Test 3: Authenticated /me endpoint
    console.log(`[Test 3] Testing /me endpoint with Bearer token...`);
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meJson = await meRes.json();
    if (meRes.status === 200 && meJson.data.user.role === 'DOCTOR' && meJson.data.user.profile.department === 'Cardiology') {
      console.log(`  ✅ Passed: /me successfully resolved doctor profile (Dept: ${meJson.data.user.profile.department})`);
    } else {
      throw new Error(`Test 3 Failed: ${JSON.stringify(meJson)}`);
    }

    // Test 4: Token Rotation (/refresh)
    console.log(`[Test 4] Testing token refresh & rotation...`);
    const refreshRes = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshJson = await refreshRes.json();
    if (refreshRes.status === 200 && refreshJson.data.accessToken && refreshJson.data.refreshToken) {
      console.log(`  ✅ Passed: Token rotated successfully. Received fresh access & refresh tokens.`);
    } else {
      throw new Error(`Test 4 Failed: ${JSON.stringify(refreshJson)}`);
    }

    // Test 5: Patient Self-Registration
    console.log(`[Test 5] Testing patient self-registration and MRN generation...`);
    const testEmail = `patient.new${Date.now()}@carepulse.local`;
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123',
        fullName: 'Emily Watson',
        phone: '+1 555-0199',
        dateOfBirth: '1995-04-12',
        gender: 'FEMALE',
        bloodGroup: 'B+'
      })
    });
    const regJson = await regRes.json();
    if (regRes.status === 201 && regJson.data.user.mrn.startsWith('MRN-')) {
      console.log(`  ✅ Passed: Registered new patient with auto-generated ${regJson.data.user.mrn}`);
    } else {
      throw new Error(`Test 5 Failed: ${JSON.stringify(regJson)}`);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL Phase 3 Authentication & Security Tests PASSED!`);
    console.log(`======================================================\n`);

    server.close();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Test Verification Failed:`, err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runAuthVerification();
