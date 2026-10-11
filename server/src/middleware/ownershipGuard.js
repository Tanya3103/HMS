const Appointment = require('../models/Appointment');

/**
 * Data Ownership & Clinical Access Guard
 * Enforces:
 * 1. Reception Staff has zero access to clinical EMR records
 * 2. Patients can only query or mutate records belonging to their profile
 * 3. Doctors must be assigned to the patient or be Admin
 */
const checkRecordOwnership = async (req, res, next) => {
  const { role, profileId } = req.user;
  const targetPatientId = req.params.patientId || req.body.patientId || req.query.patientId;

  // 1. Reception Staff is strictly prohibited from clinical EMR views
  if (role === 'STAFF') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CLINICAL_RESTRICTION',
        message: 'Front-desk staff accounts are not authorized to view or edit clinical diagnostic records.'
      }
    });
  }

  // 2. Patient can only access their own profile and records
  if (role === 'PATIENT') {
    if (!profileId || (targetPatientId && targetPatientId.toString() !== profileId.toString())) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'OWNERSHIP_VIOLATION',
          message: 'Patients may only query or access their own medical encounters and prescriptions.'
        }
      });
    }
  }

  // 3. Doctor access verification (must have an active/past appointment or be Admin)
  if (role === 'DOCTOR' && targetPatientId) {
    const hasEncounter = await Appointment.exists({
      doctorId: profileId,
      patientId: targetPatientId
    });

    if (!hasEncounter && role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOCTOR_UNASSIGNED',
          message: 'Clinical access restricted: You do not have an active or assigned consultation with this patient.'
        }
      });
    }
  }

  next();
};

module.exports = { checkRecordOwnership };
