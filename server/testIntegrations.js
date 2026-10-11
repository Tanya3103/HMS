require('dotenv').config();
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const User = require('./src/models/User');
const AuditLog = require('./src/models/AuditLog');
const bcrypt = require('bcryptjs');

let server;

async function runIntegrationVerification() {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Phase 6 On-Device Integrations Test`);
  console.log(`======================================================\n`);

  try {
    await connectDB();
    server = app.listen(5003);
    const baseUrl = 'http://localhost:5003/api/v1';

    // Ensure test admin exists
    await User.deleteMany({ email: 'audit.admin@carepulse.local' });
    const admUser = await User.create({
      email: 'audit.admin@carepulse.local',
      passwordHash: await bcrypt.hash('Adm@123', 10),
      role: 'ADMIN',
      isActive: true
    });

    // Create a mock audit entry
    await AuditLog.create({
      actorId: admUser._id,
      actorRole: 'ADMIN',
      action: 'COMPLIANCE_HEALTH_AUDIT',
      resourceType: 'SYSTEM',
      details: { verification: 'Phase 6 Integration Passed' }
    });

    // Obtain token
    const admLogin = await (await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'audit.admin@carepulse.local', password: 'Adm@123' })
    })).json();
    const token = admLogin.data.accessToken;

    // Test 1: Health probe (used by OfflineBanner)
    console.log(`[Test 1] Testing local health probe for OfflineBanner...`);
    const healthRes = await (await fetch(`${baseUrl}/health`)).json();
    if (healthRes.success && healthRes.database.status === 'connected') {
      console.log(`  ✅ Passed: Health probe verified (Database: ${healthRes.database.status})`);
    } else {
      throw new Error(`Test 1 Failed: ${JSON.stringify(healthRes)}`);
    }

    // Test 2: Admin Audit Logs
    console.log(`[Test 2] Testing admin compliance audit log retrieval...`);
    const logsRes = await (await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })).json();
    if (logsRes.success && logsRes.data.logs.length > 0) {
      console.log(`  ✅ Passed: Retrieved ${logsRes.data.logs.length} compliance audit log entries`);
    } else {
      throw new Error(`Test 2 Failed: ${JSON.stringify(logsRes)}`);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL Phase 6 On-Device Integrations Tests PASSED!`);
    console.log(`======================================================\n`);

    server.close();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Integration Verification Failed:`, err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runIntegrationVerification();
