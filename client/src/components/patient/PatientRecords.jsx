import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { PrintPrescriptionModal } from '../common/PrintPrescriptionModal';
import { FileText, Printer, Activity, Heart, Thermometer, Pill, AlertTriangle } from 'lucide-react';
import './PatientRecords.css';

export function PatientRecords() {
  const { user } = useAuth();
  const { error: toastError } = useToast();

  const [records, setRecords] = useState([]);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEMR() {
      if (!user?.profileId) return;
      setLoading(true);
      try {
        const res = await api.get(`/records/patient/${user.profileId}`);
        if (res.success) {
          setPatientData(res.data.patient);
          setRecords(res.data.records || []);
        }
      } catch (err) {
        toastError(err.message || 'Failed to fetch medical records.');
      } finally {
        setLoading(false);
      }
    }
    fetchEMR();
  }, [user]);

  const [selectedPrintRecord, setSelectedPrintRecord] = useState(null);

  const handlePrint = (record) => {
    setSelectedPrintRecord(record || records[0] || null);
  };

  return (
    <div className="patient-records-wrapper">
      <div className="records-header">
        <div>
          <h2>Electronic Medical Records &amp; Prescriptions</h2>
          <p>Longitudinal health records, diagnostic summaries, and active treatment courses.</p>
        </div>
        <Button variant="outline" size="md" icon={Printer} onClick={handlePrint}>
          Print Records
        </Button>
      </div>

      {/* Patient Clinical Profile Summary */}
      {patientData && (
        <div className="clinical-profile-strip">
          <div className="strip-item">
            <span className="strip-label">MRN</span>
            <span className="strip-val">{patientData.mrn}</span>
          </div>
          <div className="strip-item">
            <span className="strip-label">Blood Group</span>
            <span className="strip-val blood-tag">{patientData.bloodGroup || 'Not Recorded'}</span>
          </div>
          <div className="strip-item">
            <span className="strip-label">Known Allergies</span>
            <div className="allergies-list">
              {patientData.allergies?.length > 0 ? (
                patientData.allergies.map((allergy, i) => (
                  <span key={i} className="allergy-badge">
                    <AlertTriangle size={12} /> {allergy}
                  </span>
                ))
              ) : (
                <span className="strip-val text-muted">No known drug allergies</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encounters Timeline */}
      <div className="encounters-timeline">
        {loading ? (
          <p className="text-muted text-center py-8">Loading longitudinal medical records...</p>
        ) : records.length === 0 ? (
          <div className="empty-records-card">
            <FileText size={40} className="empty-icon" />
            <h3>No Medical Records on File</h3>
            <p>Your diagnostic notes and e-prescriptions will appear here following consultations with hospital physicians.</p>
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec._id} className="encounter-card">
              <div className="encounter-header">
                <div>
                  <span className="encounter-date">
                    {new Date(rec.recordDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <h3 className="diagnosis-title">{rec.diagnosis}</h3>
                  <span className="doc-signature">
                    Consulting Doctor: {rec.doctorId?.fullName} ({rec.doctorId?.department})
                  </span>
                </div>
              </div>

              {/* Vitals Summary */}
              {rec.vitals && Object.values(rec.vitals).some(Boolean) && (
                <div className="vitals-strip">
                  <div className="vital-box">
                    <Activity size={16} className="vital-icon bp" />
                    <div>
                      <span className="vital-lbl">Blood Pressure</span>
                      <span className="vital-val">{rec.vitals.bloodPressure || '—'} mmHg</span>
                    </div>
                  </div>
                  <div className="vital-box">
                    <Heart size={16} className="vital-icon pulse" />
                    <div>
                      <span className="vital-lbl">Pulse Rate</span>
                      <span className="vital-val">{rec.vitals.pulseRate || '—'} bpm</span>
                    </div>
                  </div>
                  <div className="vital-box">
                    <Thermometer size={16} className="vital-icon temp" />
                    <div>
                      <span className="vital-lbl">Body Temp</span>
                      <span className="vital-val">{rec.vitals.temperature || '—'} °F</span>
                    </div>
                  </div>
                  <div className="vital-box">
                    <Activity size={16} className="vital-icon spo2" />
                    <div>
                      <span className="vital-lbl">Oxygen (SpO2)</span>
                      <span className="vital-val">{rec.vitals.spO2 || '—'}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Symptoms & Notes */}
              {rec.clinicalNotes && (
                <div className="clinical-notes-section">
                  <span className="section-subtitle">Physician Clinical Notes:</span>
                  <p className="notes-text">{rec.clinicalNotes}</p>
                </div>
              )}

              {/* Prescriptions List */}
              {rec.prescriptions?.length > 0 && (
                <div className="prescriptions-section">
                  <div className="rx-head">
                    <Pill size={16} className="rx-icon" />
                    <span className="section-subtitle">Prescribed Medications (E-Prescription)</span>
                  </div>
                  <table className="rx-table">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.prescriptions.map((rx, idx) => (
                        <tr key={idx}>
                          <td className="font-bold">{rx.medicineName}</td>
                          <td>{rx.dosage}</td>
                          <td>{rx.frequency}</td>
                          <td>{rx.duration}</td>
                          <td className="text-secondary">{rx.instructions || 'As advised'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <PrintPrescriptionModal
        isOpen={!!selectedPrintRecord}
        onClose={() => setSelectedPrintRecord(null)}
        record={selectedPrintRecord}
        patient={patientData}
      />
    </div>
  );
}
