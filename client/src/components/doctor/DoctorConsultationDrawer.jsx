import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';
import {
  X,
  Activity,
  Heart,
  Thermometer,
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import './DoctorConsultationDrawer.css';

export function DoctorConsultationDrawer({ isOpen, onClose, appointment, onSuccess }) {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('encounter'); // 'encounter' | 'history'
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // History State
  const [patientHistory, setPatientHistory] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);

  // Active Encounter Form State
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('70');
  const [spo2, setSpo2] = useState('98');
  const [symptomsText, setSymptomsText] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Repeatable Prescriptions
  const [prescriptions, setPrescriptions] = useState([
    { medicineName: '', dosage: '', frequency: 'OD', duration: '5 days', instructions: 'Take post food' }
  ]);

  // Fetch longitudinal history when appointment opens
  useEffect(() => {
    if (!isOpen || !appointment?.patientId?._id) return;

    async function loadPatientEMR() {
      setLoadingHistory(true);
      try {
        const res = await api.get(`/records/patient/${appointment.patientId._id}`);
        if (res.success) {
          setPatientHistory(res.data.patient);
          setPastRecords(res.data.records || []);
        }
      } catch (err) {
        toastError('Failed to retrieve patient historical records.');
      } finally {
        setLoadingHistory(false);
      }
    }

    loadPatientEMR();
  }, [isOpen, appointment]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const addPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medicineName: '', dosage: '', frequency: 'OD', duration: '5 days', instructions: '' }
    ]);
  };

  const removePrescriptionRow = (index) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRxChange = (index, field, value) => {
    setPrescriptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmitEncounter = async () => {
    if (!diagnosis.trim()) {
      toastError('Please specify a clinical diagnosis');
      return;
    }

    setLoading(true);
    try {
      const validPrescriptions = prescriptions.filter(
        (rx) => rx.medicineName.trim() && rx.dosage.trim()
      );

      const symptoms = symptomsText
        ? symptomsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        appointmentId: appointment._id,
        patientId: appointment.patientId._id,
        vitals: {
          bloodPressure: bp,
          pulseRate: Number(pulse) || null,
          temperature: Number(temp) || null,
          weightKg: Number(weight) || null,
          spO2: Number(spo2) || null
        },
        symptoms,
        diagnosis,
        clinicalNotes,
        prescriptions: validPrescriptions
      };

      const res = await api.post('/records', payload);
      if (res.success) {
        success('Clinical encounter recorded and appointment marked as completed!');
        onSuccess();
      }
    } catch (err) {
      toastError(err.message || 'Failed to record encounter');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const patient = appointment.patientId;
  const allergies = patient?.allergies || [];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Clinical Consultation & EMR Drawer"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-patient-info">
            <div className="drawer-avatar">
              <Stethoscope size={22} />
            </div>
            <div>
              <h3>{patient?.fullName}</h3>
              <div className="drawer-patient-meta">
                <span>MRN: <strong>{patient?.mrn}</strong></span>
                <span>• Blood: <strong className="blood-tag">{patient?.bloodGroup || 'N/A'}</strong></span>
                <span>• Gender: {patient?.gender}</span>
              </div>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* High-Visibility Allergy Alert (3-Second Critical UX Rule) */}
        {allergies.length > 0 && (
          <div className="critical-allergy-banner">
            <AlertTriangle size={18} />
            <span>
              <strong>CRITICAL DRUG ALLERGIES DOCUMENTED:</strong> {allergies.join(', ')}
            </span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'encounter' ? 'active' : ''}`}
            onClick={() => setActiveTab('encounter')}
          >
            Active Consultation Form
          </button>
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Longitudinal Patient History ({pastRecords.length})
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {activeTab === 'encounter' ? (
            <div className="encounter-form-flow">
              {/* Section 1: Vitals Grid */}
              <div className="form-section">
                <span className="section-title">1. Objective Vitals</span>
                <div className="vitals-inputs-grid">
                  <InputField
                    id="vit-bp"
                    label="Blood Pressure"
                    placeholder="120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                  />
                  <InputField
                    id="vit-pulse"
                    label="Pulse (bpm)"
                    placeholder="72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                  />
                  <InputField
                    id="vit-temp"
                    label="Temp (°F)"
                    placeholder="98.6"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                  />
                  <InputField
                    id="vit-spo2"
                    label="SpO2 (%)"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 2: Symptoms & Diagnosis */}
              <div className="form-section">
                <span className="section-title">2. Symptoms &amp; Primary Diagnosis</span>
                <InputField
                  id="diag-symptoms"
                  label="Subjective Symptoms (Comma-separated)"
                  placeholder="e.g. Dizziness on standing, mild occipital headache"
                  value={symptomsText}
                  onChange={(e) => setSymptomsText(e.target.value)}
                />
                <InputField
                  id="diag-title"
                  label="Clinical Diagnosis *"
                  placeholder="e.g. Stage 1 Essential Hypertension"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  required
                />
                <div className="input-group">
                  <label className="input-label">Clinical Notes &amp; Examination Observations</label>
                  <textarea
                    id="diag-notes"
                    className="input-control"
                    rows={3}
                    placeholder="Physical examination notes, lab referrals, lifestyle guidance..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 3: E-Prescription Builder */}
              <div className="form-section">
                <div className="rx-section-header">
                  <span className="section-title">3. E-Prescriptions</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={addPrescriptionRow}
                  >
                    Add Medication
                  </Button>
                </div>

                <div className="rx-rows-list">
                  {prescriptions.map((rx, idx) => (
                    <div key={idx} className="rx-row-item">
                      <div className="rx-inputs-grid">
                        <InputField
                          id={`rx-med-${idx}`}
                          placeholder="Medicine Name (e.g. Amlodipine)"
                          value={rx.medicineName}
                          onChange={(e) => handleRxChange(idx, 'medicineName', e.target.value)}
                        />
                        <InputField
                          id={`rx-dose-${idx}`}
                          placeholder="Dose (e.g. 5mg)"
                          value={rx.dosage}
                          onChange={(e) => handleRxChange(idx, 'dosage', e.target.value)}
                        />
                        <select
                          className="input-control"
                          value={rx.frequency}
                          onChange={(e) => handleRxChange(idx, 'frequency', e.target.value)}
                        >
                          <option value="OD">Once Daily (OD)</option>
                          <option value="BD">Twice Daily (BD)</option>
                          <option value="TDS">Three Times (TDS)</option>
                          <option value="QID">Four Times (QID)</option>
                          <option value="PRN">As Needed (PRN)</option>
                        </select>
                        <InputField
                          id={`rx-dur-${idx}`}
                          placeholder="Duration (e.g. 30 days)"
                          value={rx.duration}
                          onChange={(e) => handleRxChange(idx, 'duration', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-rx-delete"
                        onClick={() => removePrescriptionRow(idx)}
                        title="Remove drug"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Tab: History View */
            <div className="drawer-history-view">
              {loadingHistory ? (
                <p className="text-muted text-center p-8">Fetching indexed longitudinal records...</p>
              ) : pastRecords.length === 0 ? (
                <div className="empty-history-box">
                  <FileText size={32} className="text-muted" />
                  <p>No prior medical encounters recorded for this patient.</p>
                </div>
              ) : (
                pastRecords.map((rec) => (
                  <div key={rec._id} className="history-past-card">
                    <div className="past-head">
                      <span className="past-date">{new Date(rec.recordDate).toLocaleDateString()}</span>
                      <span className="past-doc">Dr. {rec.doctorId?.fullName}</span>
                    </div>
                    <h4 className="past-diag">{rec.diagnosis}</h4>
                    {rec.clinicalNotes && <p className="past-notes">{rec.clinicalNotes}</p>}
                    {rec.prescriptions?.length > 0 && (
                      <div className="past-rx-summary">
                        <strong>Prescribed:</strong>{' '}
                        {rec.prescriptions.map((p) => `${p.medicineName} (${p.dosage})`).join(', ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Save Draft / Close
          </Button>
          <Button
            id="btn-complete-consultation"
            variant="primary"
            icon={CheckCircle2}
            loading={loading}
            onClick={handleSubmitEncounter}
          >
            Finalize Encounter &amp; Discharge
          </Button>
        </div>
      </div>
    </div>
  );
}
