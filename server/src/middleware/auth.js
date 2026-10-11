const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const { verifyAccessToken } = require('../utils/token');

/**
 * Middleware: Verify Bearer JWT Token and attach user + profile
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token is missing. Please log in.'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  const { valid, decoded, expired, error } = verifyAccessToken(token);

  if (!valid) {
    return res.status(401).json({
      success: false,
      error: {
        code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: expired ? 'Your session has expired. Please refresh your token.' : `Invalid token: ${error}`
      }
    });
  }

  try {
    const user = await User.findById(decoded.sub).lean();

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_DEACTIVATED',
          message: 'User account not found or has been deactivated.'
        }
      });
    }

    // Attach basic user details
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      profileId: null
    };

    // Resolve profileId based on role for fast object-level ownership checks
    if (user.role === 'PATIENT') {
      const patient = await PatientProfile.findOne({ userId: user._id }).select('_id mrn fullName').lean();
      if (patient) {
        req.user.profileId = patient._id.toString();
        req.user.mrn = patient.mrn;
        req.user.name = patient.fullName;
      }
    } else if (user.role === 'DOCTOR') {
      const doctor = await DoctorProfile.findOne({ userId: user._id }).select('_id fullName department').lean();
      if (doctor) {
        req.user.profileId = doctor._id.toString();
        req.user.name = doctor.fullName;
        req.user.department = doctor.department;
      }
    }

    next();
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_PROCESSING_ERROR',
        message: 'Failed to verify user authorization state.'
      }
    });
  }
}

module.exports = { authenticateJWT };
