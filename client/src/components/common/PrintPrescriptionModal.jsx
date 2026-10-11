import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, HeartPulse, Stethoscope, AlertTriangle } from 'lucide-react';
import './PrintPrescriptionModal.css';

export function PrintPrescriptionModal({ isOpen, onClose, record, patient }) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const doctor = record.doctorId || {};
  const patientData = patient || record.patientId || {};
  const vitals = record.vitals || {};
  const prescriptions = record.prescriptions || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Medical Prescription & Encounter Summary"
      maxWidth="780px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button id="btn-print-rx-dialog" variant="primary" icon={Printer} onClick={handlePrint}>
            Print / Save as PDF
          </Button>
        </>
      }
    >
      <div className="printable-rx-container" id="printable-rx-content">
        {/* Hospital Letterhead */}
        <div className="rx-letterhead">
          <div className="letterhead-brand">
            <div className="rx-logo-box">
              <HeartPulse size={26} />
            </div>
            <div>
              <h2 className="hospital-name">CAREPULSE GENERAL HOSPITAL</h2>
              <p className="hospital-sub">Department of {doctor.department || 'Clinical Medicine'} • Outpatient Services</p>
              <p className="hospital-contact">742 Evergreen Medical Park • Localhost Health Network • Emergency: 911</p>
            </div>
          </div>
          <div className="rx-doc-block">
            <span className="rx-doc-name">{doctor.fullName || 'Attending Physician'}</span>
            <span className="rx-doc-license">License: {doctor.licenseNumber || 'MED-REG-ACTIVE'}</span>
            <span className="rx-doc-room">{doctor.roomNumber || 'Clinic Room'}</span>
          </div>
        </div>

        <div className="rx-divider" />

        {/* Patient Demographic Strip */}
        <div className="rx-patient-strip">
          <div className="rx-patient-item">
            <span className="rx-lbl">PATIENT NAME:</span>
            <span className="rx-val">{patientData.fullName}</span>
          </div>
          <div className="rx-patient-item">
            <span className="rx-lbl">MRN:</span>
            <span className="rx-val font-mono">{patientData.mrn}</span>
          </div>
          <div className="rx-patient-item">
            <span className="rx-lbl">GENDER / BLOOD:</span>
            <span className="rx-val">{patientData.gender || '—'} / <strong style={{ color: '#DC2626' }}>{patientData.bloodGroup || 'N/A'}</strong></span>
          </div>
          <div className="rx-patient-item">
            <span className="rx-lbl">DATE OF ENCOUNTER:</span>
            <span className="rx-val">{new Date(record.recordDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Allergy Warning if present */}
        {patientData.allergies?.length > 0 && (
          <div className="rx-allergy-alert">
            <AlertTriangle size={14} />
            <span><strong>DOCUMENTED DRUG ALLERGIES:</strong> {patientData.allergies.join(', ')}</span>
          </div>
        )}

        {/* Vitals Summary */}
        {Object.values(vitals).some(Boolean) && (
          <div className="rx-vitals-box">
            <span className="rx-section-lbl">PATIENT VITALS:</span>
            <div className="rx-vitals-row">
              {vitals.bloodPressure && <span>BP: <strong>{vitals.bloodPressure} mmHg</strong></span>}
              {vitals.pulseRate && <span>Pulse: <strong>{vitals.pulseRate} bpm</strong></span>}
              {vitals.temperature && <span>Temp: <strong>{vitals.temperature} °F</strong></span>}
              {vitals.spO2 && <span>SpO2: <strong>{vitals.spO2}%</strong></span>}
              {vitals.weightKg && <span>Weight: <strong>{vitals.weightKg} kg</strong></span>}
            </div>
          </div>
        )}

        {/* Diagnosis & Clinical Notes */}
        <div className="rx-diagnosis-block">
          <div className="rx-diag-title">
            <span className="rx-lbl">CLINICAL DIAGNOSIS:</span>
            <h4 className="diag-heading">{record.diagnosis}</h4>
          </div>
          {record.clinicalNotes && (
            <div className="rx-notes">
              <span className="rx-lbl">CLINICAL OBSERVATIONS &amp; ADVICE:</span>
              <p className="rx-notes-text">{record.clinicalNotes}</p>
            </div>
          )}
        </div>

        {/* The Rx Symbol and Prescriptions Table */}
        <div className="rx-table-section">
          <div className="rx-symbol-row">
            <span className="rx-symbol">℞</span>
            <span className="rx-table-title">PRESCRIBED MEDICATIONS</span>
          </div>

          <table className="official-rx-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Medication Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#64748B' }}>
                    No prescription medications recorded for this visit.
                  </td>
                </tr>
              ) : (
                prescriptions.map((rx, idx) => (
                  <tr key={idx}>
                    <td className="rx-med-name">{idx + 1}. {rx.medicineName}</td>
                    <td>{rx.dosage}</td>
                    <td>{rx.frequency}</td>
                    <td>{rx.duration}</td>
                    <td>{rx.instructions || 'As advised'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="rx-signature-footer">
          <div className="rx-disclaimer">
            This is an official computer-generated medical record from CarePulse HMS Localhost Edition.
          </div>
          <div className="rx-signature-block">
            <div className="signature-line" />
            <span className="signature-name">{doctor.fullName || 'Consulting Physician'}</span>
            <span className="signature-title">Authorized Medical Practitioner</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
