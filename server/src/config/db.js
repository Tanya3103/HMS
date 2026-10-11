const mongoose = require('mongoose');

let mongodInstance = null;

/**
 * Connect to MongoDB with automatic fallback to on-device embedded instance
 */
async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carepulse_hms';
  
  // Quick timeout probe for local standalone MongoDB service
  try {
    console.log(`[Database] Attempting connection to local MongoDB service at: ${primaryUri}`);
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 2000 // Fast failover if local service is inactive
    });
    console.log(`[Database] Successfully connected to local MongoDB instance: ${primaryUri}`);
    return;
  } catch (err) {
    console.warn(`[Database] Local MongoDB service on port 27017 is unavailable (${err.message}).`);
    console.log(`[Database] Launching on-device embedded MongoDB engine...`);
  }

  // Fallback to embedded on-device MongoDB instance
  try {
    const path = require('path');
    const fs = require('fs');
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const serverCacheDir = path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server');
    const rootCacheDir = path.resolve(__dirname, '../../../node_modules/.cache/mongodb-memory-server');
    const downloadDir = fs.existsSync(serverCacheDir) ? serverCacheDir : rootCacheDir;

    mongodInstance = await MongoMemoryServer.create({
      binary: {
        downloadDir,
        version: '7.0.24'
      },
      instance: {
        dbName: 'carepulse_hms',
        port: 27018
      }
    });

    const embeddedUri = mongodInstance.getUri();
    await mongoose.connect(embeddedUri);
    console.log(`[Database] Successfully connected to on-device embedded MongoDB at: ${embeddedUri}`);
  } catch (embeddedErr) {
    console.error(`[Database] Failed to initialize database:`, embeddedErr);
    process.exit(1);
  }
}

/**
 * Graceful database shutdown
 */
async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

module.exports = { connectDB, disconnectDB };
