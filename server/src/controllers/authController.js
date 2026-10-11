const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, generateRefreshToken, hashToken } = require('../utils/token');

const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) || 7;

/**
 * Generate a unique Medical Record Number (MRN)
 */
async function generateUniqueMRN() {
  const year = new Date().getFullYear();
  const count = await PatientProfile.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  return `MRN-${year}-${sequence}`;
}

/**
 * Controller: Register a new patient
 */
async function registerPatient(req, res) {
  try {
    const { email, password, fullName, phone, dateOfBirth, gender, bloodGroup, allergies, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists. Please log in.'
        }
      });
    }

    // Hash password with bcrypt (work factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create User record
    const user = await User.create({
      email,
      passwordHash,
      role: 'PATIENT',
      isActive: true,
      lastLoginAt: new Date()
    });

    // Generate unique MRN and create Patient Profile
    const mrn = await generateUniqueMRN();
    const patientProfile = await PatientProfile.create({
      userId: user._id,
      mrn,
      fullName,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      bloodGroup: bloodGroup || null,
      allergies: allergies || [],
      address: address || {}
    });

    // Issue Tokens
    const accessToken = signAccessToken({
      sub: user._id,
      email: user.email,
      role: user.role
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      deviceInfo: req.headers['user-agent'] || 'Localhost Client'
    });

    res.status(201).json({
      success: true,
      message: 'Patient account registered successfully.',
      data: {
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: patientProfile.fullName,
          profileId: patientProfile._id,
          mrn: patientProfile.mrn
        }
      }
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: err.message || 'Failed to complete registration.'
      }
    });
  }
}

/**
 * Controller: Universal User Login (Patient, Doctor, Staff, Admin)
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Fetch user with passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please verify your credentials.'
        }
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been deactivated. Please contact the clinic administrator.'
        }
      });
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please verify your credentials.'
        }
      });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Resolve Role-Specific Profile
    let profileData = null;
    let displayName = user.email.split('@')[0];

    if (user.role === 'PATIENT') {
      const patient = await PatientProfile.findOne({ userId: user._id }).lean();
      if (patient) {
        profileData = patient;
        displayName = patient.fullName;
      }
    } else if (user.role === 'DOCTOR') {
      const doctor = await DoctorProfile.findOne({ userId: user._id }).lean();
      if (doctor) {
        profileData = doctor;
        displayName = doctor.fullName;
      }
    }

    // Issue JWT Access Token & Refresh Token
    const accessToken = signAccessToken({
      sub: user._id,
      email: user.email,
      role: user.role
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      deviceInfo: req.headers['user-agent'] || 'Localhost Client'
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: displayName,
          profileId: profileData ? profileData._id : null,
          profile: profileData
        }
      }
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'An unexpected error occurred during login.'
      }
    });
  }
}

/**
 * Controller: Refresh Access Token with Token Rotation
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken: incomingToken } = req.body;
    const incomingHash = hashToken(incomingToken);

    const storedToken = await RefreshToken.findOne({
      tokenHash: incomingHash,
      isRevoked: false
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is expired or revoked. Please log in again.'
        }
      });
    }

    // Revoke previous token (Token Rotation Security Pattern)
    storedToken.isRevoked = true;
    await storedToken.save();

    const user = await User.findById(storedToken.userId).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is no longer active.'
        }
      });
    }

    // Issue new pair
    const newAccessToken = signAccessToken({
      sub: user._id,
      email: user.email,
      role: user.role
    });

    const newRawRefreshToken = generateRefreshToken();
    const newExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRawRefreshToken),
      expiresAt: newExpiresAt,
      deviceInfo: req.headers['user-agent'] || 'Localhost Client'
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken
      }
    });
  } catch (err) {
    console.error('[Refresh Error]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: 'Failed to refresh authentication token.'
      }
    });
  }
}

/**
 * Controller: Logout / Revoke Session
 */
async function logout(req, res) {
  try {
    const { refreshToken: incomingToken } = req.body;
    if (incomingToken) {
      const incomingHash = hashToken(incomingToken);
      await RefreshToken.updateOne({ tokenHash: incomingHash }, { isRevoked: true });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out. Session has been terminated.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Error terminating session.'
      }
    });
  }
}

/**
 * Controller: Get Authenticated User Profile
 */
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    let profile = null;
    if (user.role === 'PATIENT') {
      profile = await PatientProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'DOCTOR') {
      profile = await DoctorProfile.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          name: req.user.name || user.email.split('@')[0],
          profileId: req.user.profileId,
          profile
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
}

module.exports = {
  registerPatient,
  login,
  refreshToken,
  logout,
  getMe
};
