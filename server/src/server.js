require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const { seedDatabase } = require('./seeds/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database (local standalone or embedded fallback)
    await connectDB();

    // Ensure database is populated with initial demo clinical data
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log(`[Database] No records found. Auto-seeding initial clinical demo dataset...`);
      await seedDatabase(false);
    }

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🏥 CarePulse HMS API Server running on localhost:${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error(`Failed to launch server:`, err);
    process.exit(1);
  }
}

startServer();
