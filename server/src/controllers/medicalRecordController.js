const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const AuditLog = require('../models/AuditLog');

/**
 * Controller: Get Longitudinal Patient Medical Records (Sub-50ms Indexed Query)
 */
async function getPatientHistory(req, res) {
  try {
    const { patientId } = req.params;

    // Fetch patient demographics (allergies, bloodGroup)
    const patient = await PatientProfile.findById(patientId)
      .select('fullName mrn dateOfBirth gender bloodGroup allergies emergencyContact')
      .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found' }
      });
    }

    // Longitudinal timeline using indexed projection { patientId: 1, recordDate: -1 }
    const records = await MedicalRecord.find({ patientId })
      .sort({ recordDate: -1 })
      .populate('doctorId', 'fullName department licenseNumber')
      .lean();

    // Audit log access
    await AuditLog.create({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'EMR_RECORD_VIEW',
      resourceType: 'MEDICAL_RECORD',
      resourceId: null,
      details: { patientId, recordCount: records.length }
    });

    res.status(200).json({
      success: true,
      data: {
        patient,
        records
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'EMR_FETCH_ERROR', message: err.message }
    });
  }
}

/**
 * Controller: Create Clinical Encounter / EMR Record (Authoring Physician)
 */
async function createEncounter(req, res) {
  try {
    const doctorId = req.user.profileId;
    if (!doctorId) {
      return res.status(403).json({
        success: false,
        error: { code: 'DOCTOR_REQUIRED', message: 'Only doctor accounts can author clinical records' }
      });
    }

    const { appointmentId, patientId, vitals, symptoms, diagnosis, clinicalNotes, prescriptions } = req.body;

    if (!appointmentId || !patientId || !diagnosis) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'appointmentId, patientId, and diagnosis are required' }
      });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found' }
      });
    }

    // Check if record already authored for this appointment
    const existing = await MedicalRecord.findOne({ appointmentId }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'RECORD_ALREADY_EXISTS', message: 'A clinical record has already been saved for this appointment.' }
      });
    }

    // Create medical record
    const record = await MedicalRecord.create({
      patientId,
      doctorId,
      appointmentId,
      vitals: vitals || {},
      symptoms: symptoms || [],
      diagnosis,
      clinicalNotes: clinicalNotes || '',
      prescriptions: prescriptions || [],
      recordDate: new Date()
    });

    // Advance appointment status to COMPLETED
    appointment.status = 'COMPLETED';
    appointment.completedTime = new Date();
    await appointment.save();

    const populatedRecord = await MedicalRecord.findById(record._id)
      .populate('doctorId', 'fullName department')
      .populate('patientId', 'fullName mrn')
      .lean();

    // Audit log
    await AuditLog.create({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'EMR_ENCOUNTER_CREATED',
      resourceType: 'MEDICAL_RECORD',
      resourceId: record._id,
      details: { patientId, appointmentId, diagnosis }
    });

    res.status(201).json({
      success: true,
      message: 'Clinical encounter and prescription recorded successfully.',
      data: { record: populatedRecord }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SAVE_FAILED', message: err.message }
    });
  }
}

module.exports = {
  getPatientHistory,
  createEncounter
};
