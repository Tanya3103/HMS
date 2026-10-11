import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';
import { Calendar, Clock, User, CheckCircle2, Stethoscope, ArrowRight, ArrowLeft } from 'lucide-react';
import './PatientBookAppointment.css';

export function PatientBookAppointment({ onNavigateTab }) {
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Booking Draft State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');

  // Fetch doctors on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await api.get('/staff/doctors');
        if (res.success) {
          setDoctors(res.data.doctors || []);
        }
      } catch (err) {
        toastError('Failed to load clinic specialist directory.');
      }
    }
    fetchDoctors();
  }, []);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await api.get(
          `/appointments/available-slots?doctorId=${selectedDoctor._id}&date=${selectedDate}`
        );
        if (res.success) {
          setAvailableSlots(res.data.slots || []);
        }
      } catch (err) {
        toastError('Failed to fetch slot availability.');
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Handle final submission
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toastError('Please select doctor, date, and a valid slot');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/appointments', {
        doctorId: selectedDoctor._id,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        reason: reason || 'Routine Clinical Consultation'
      });

      if (res.success) {
        success('Appointment booked successfully! Returning to dashboard.');
        setTimeout(() => {
          onNavigateTab('patient-dashboard');
        }, 1200);
      }
    } catch (err) {
      if (err.code === 'SLOT_COLLISION') {
        toastError('Slot collision: This slot was just reserved. Please pick another slot.');
        // Refresh slots
        const reloadRes = await api.get(
          `/appointments/available-slots?doctorId=${selectedDoctor._id}&date=${selectedDate}`
        );
        if (reloadRes.success) setAvailableSlots(reloadRes.data.slots || []);
      } else {
        toastError(err.message || 'Failed to confirm booking.');
      }
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', ...new Set(doctors.map((d) => d.department))];
  const filteredDoctors = selectedDept === 'ALL'
    ? doctors
    : doctors.filter((d) => d.department === selectedDept);

  return (
    <div className="book-appointment-wrapper">
      <div className="booking-header">
        <h2>Schedule Clinical Consultation</h2>
        <p>Book an outpatient consultation with a specialist on duty.</p>
      </div>

      {/* 3-Step Progress Indicator */}
      <div className="stepper-bar">
        <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-num">1</div>
          <span className="step-title">Choose Specialist</span>
        </div>
        <div className="step-connector" />
        <div className={`step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-num">2</div>
          <span className="step-title">Select Date &amp; Slot</span>
        </div>
        <div className="step-connector" />
        <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <span className="step-title">Review &amp; Confirm</span>
        </div>
      </div>

      {/* STEP 1: Select Specialist */}
      {step === 1 && (
        <div className="step-card">
          <div className="filter-dept-row">
            <span className="filter-label">Filter Department:</span>
            <div className="dept-pills">
              {departments.map((dept) => (
                <button
                  key={dept}
                  className={`dept-pill ${selectedDept === dept ? 'active' : ''}`}
                  onClick={() => setSelectedDept(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="doctors-grid">
            {filteredDoctors.map((doc) => {
              const isSelected = selectedDoctor?._id === doc._id;
              return (
                <div
                  key={doc._id}
                  id={`doc-card-${doc._id}`}
                  className={`doctor-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDoctor(doc)}
                >
                  <div className="doc-avatar">
                    <Stethoscope size={24} />
                  </div>
                  <div className="doc-details">
                    <h4>{doc.fullName}</h4>
                    <span className="doc-dept">{doc.department}</span>
                    <p className="doc-spec">{doc.specialization}</p>
                    <div className="doc-extra">
                      <span>Room: {doc.roomNumber}</span>
                      <span>Fee: ${doc.consultationFee}</span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="select-check" size={20} />}
                </div>
              );
            })}
          </div>

          <div className="step-nav-footer">
            <Button
              variant="ghost"
              onClick={() => onNavigateTab('patient-dashboard')}
            >
              Cancel
            </Button>
            <Button
              id="btn-step1-next"
              variant="primary"
              icon={ArrowRight}
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
            >
              Continue to Date &amp; Slot
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Date & Slot */}
      {step === 2 && (
        <div className="step-card">
          <div className="step2-split">
            <div className="date-picker-section">
              <label className="input-label">Consultation Date</label>
              <input
                id="booking-date-picker"
                type="date"
                className="input-control"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <div className="selected-doc-summary-badge">
                <Stethoscope size={16} />
                <span>
                  Consulting with <strong>{selectedDoctor?.fullName}</strong> ({selectedDoctor?.department})
                </span>
              </div>
            </div>

            <div className="slots-picker-section">
              <label className="input-label">Available Clinic Slots</label>
              {loadingSlots ? (
                <p className="text-muted">Loading available time slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-muted">No consultation slots configured for this date.</p>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => {
                    const isPicked = selectedSlot === slot.timeSlot;
                    return (
                      <button
                        key={slot.timeSlot}
                        type="button"
                        disabled={!slot.isAvailable}
                        className={`slot-chip ${isPicked ? 'picked' : ''} ${!slot.isAvailable ? 'booked' : ''}`}
                        onClick={() => setSelectedSlot(slot.timeSlot)}
                      >
                        {slot.timeSlot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="step-nav-footer">
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              id="btn-step2-next"
              variant="primary"
              icon={ArrowRight}
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
            >
              Review Details
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Reason & Confirmation */}
      {step === 3 && (
        <div className="step-card">
          <div className="booking-summary-box">
            <h3>Consultation Summary</h3>
            <div className="summary-details-grid">
              <div>
                <span className="label">Doctor:</span>
                <span className="val">{selectedDoctor?.fullName}</span>
              </div>
              <div>
                <span className="label">Department:</span>
                <span className="val">{selectedDoctor?.department}</span>
              </div>
              <div>
                <span className="label">Room:</span>
                <span className="val">{selectedDoctor?.roomNumber}</span>
              </div>
              <div>
                <span className="label">Date:</span>
                <span className="val">{new Date(selectedDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="label">Time Slot:</span>
                <span className="val">{selectedSlot}</span>
              </div>
              <div>
                <span className="label">Fee:</span>
                <span className="val">${selectedDoctor?.consultationFee}</span>
              </div>
            </div>
          </div>

          <div className="reason-input-group">
            <label htmlFor="txt-visit-reason" className="input-label">
              Reason for Consultation / Primary Symptoms
            </label>
            <textarea
              id="txt-visit-reason"
              className="input-control textarea-reason"
              rows={3}
              placeholder="e.g. Follow-up for blood pressure medication, or persistent morning headaches..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="step-nav-footer">
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => setStep(2)}
            >
              Back
            </Button>
            <Button
              id="btn-step3-confirm"
              variant="primary"
              loading={loading}
              icon={CheckCircle2}
              onClick={handleConfirmBooking}
            >
              Confirm Appointment Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
