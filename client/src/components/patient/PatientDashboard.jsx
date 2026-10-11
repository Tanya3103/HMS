import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Calendar, Clock, MapPin, Plus, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import './PatientDashboard.css';

export function PatientDashboard({ onNavigateTab }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/patient/my');
      if (res.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load your appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelClick = (appt) => {
    setSelectedAppt(appt);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedAppt) return;
    setCancellingId(selectedAppt._id);

    try {
      const res = await api.patch(`/appointments/${selectedAppt._id}/status`, {
        status: 'CANCELLED',
        cancelledReason: 'Cancelled by patient via portal'
      });

      if (res.success) {
        success('Appointment cancelled successfully.');
        setAppointments(prev =>
          prev.map(a => a._id === selectedAppt._id ? { ...a, status: 'CANCELLED' } : a)
        );
        setShowCancelModal(false);
      }
    } catch (err) {
      toastError(err.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  // Find next upcoming non-cancelled appointment
  const upcoming = appointments.find(
    a => a.status === 'SCHEDULED' || a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION'
  );

  return (
    <div className="patient-dash-wrapper">
      {/* Top Action Bar */}
      <div className="dash-action-bar">
        <div>
          <h2>Patient Health Dashboard</h2>
          <p>Manage your upcoming doctor visits, clinical encounters, and digital prescriptions.</p>
        </div>
        <div className="dash-btns">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={fetchAppointments}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            id="btn-dash-book-new"
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => onNavigateTab('patient-book')}
          >
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Hero: Next Appointment Card */}
      {upcoming ? (
        <div className="next-appointment-card">
          <div className="next-card-badge">NEXT UPCOMING VISIT</div>
          <div className="next-card-content">
            <div className="doctor-info-chunk">
              <h3>{upcoming.doctorId?.fullName || 'Attending Specialist'}</h3>
              <span className="dept-tag">{upcoming.doctorId?.department || 'Outpatient Clinic'}</span>
              <p className="visit-reason">Reason: {upcoming.reason}</p>
            </div>

            <div className="appointment-meta-grid">
              <div className="meta-item">
                <Calendar size={18} className="meta-icon" />
                <div>
                  <span className="meta-label">Date</span>
                  <span className="meta-val">
                    {new Date(upcoming.appointmentDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="meta-item">
                <Clock size={18} className="meta-icon" />
                <div>
                  <span className="meta-label">Time Slot</span>
                  <span className="meta-val">{upcoming.timeSlot}</span>
                </div>
              </div>

              <div className="meta-item">
                <MapPin size={18} className="meta-icon" />
                <div>
                  <span className="meta-label">Room / Desk</span>
                  <span className="meta-val">{upcoming.doctorId?.roomNumber || 'Main Clinic'}</span>
                </div>
              </div>
            </div>

            <div className="next-card-actions">
              <StatusBadge status={upcoming.status} />
              {upcoming.status === 'SCHEDULED' && (
                <Button
                  id="btn-cancel-upcoming"
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => handleCancelClick(upcoming)}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-next-card">
          <Calendar size={36} className="empty-icon" />
          <div>
            <h4>No Upcoming Appointments</h4>
            <p>You have no active clinic consultations scheduled. Book a slot with our on-duty specialists.</p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => onNavigateTab('patient-book')}
          >
            Schedule Now
          </Button>
        </div>
      )}

      {/* Appointment History Table */}
      <div className="history-table-container">
        <div className="history-table-header">
          <h3>Your Consultation History</h3>
          <span className="history-count">{appointments.length} Total Records</span>
        </div>

        {appointments.length === 0 ? (
          <div className="empty-table-state">
            <p>No appointment records found.</p>
          </div>
        ) : (
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Slot</th>
                <th>Specialist</th>
                <th>Department</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt._id}>
                  <td className="font-semibold">
                    {new Date(appt.appointmentDate).toLocaleDateString()}
                  </td>
                  <td>{appt.timeSlot}</td>
                  <td>{appt.doctorId?.fullName || 'Doctor'}</td>
                  <td>{appt.doctorId?.department || 'General'}</td>
                  <td>
                    <StatusBadge status={appt.status} />
                  </td>
                  <td>
                    {appt.status === 'SCHEDULED' ? (
                      <button
                        className="btn-table-cancel"
                        onClick={() => handleCancelClick(appt)}
                      >
                        Cancel
                      </button>
                    ) : appt.status === 'COMPLETED' ? (
                      <button
                        className="btn-table-view-rx"
                        onClick={() => onNavigateTab('patient-records')}
                      >
                        View Rx
                      </button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Confirm Appointment Cancellation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancelModal(false)}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              loading={cancellingId === selectedAppt?._id}
              onClick={confirmCancel}
            >
              Yes, Cancel Slot
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to cancel your consultation with{' '}
          <strong>{selectedAppt?.doctorId?.fullName}</strong> on{' '}
          <strong>
            {selectedAppt && new Date(selectedAppt.appointmentDate).toLocaleDateString()} at{' '}
            {selectedAppt?.timeSlot}
          </strong>?
        </p>
        <p className="modal-subtext">This will release the reserved slot back to the clinic calendar.</p>
      </Modal>
    </div>
  );
}
