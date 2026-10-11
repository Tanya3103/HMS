import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { DoctorConsultationDrawer } from './DoctorConsultationDrawer';
import {
  Clock,
  UserCheck,
  Stethoscope,
  RefreshCw,
  AlertTriangle,
  PlayCircle,
  FileEdit,
  CheckCircle2,
  Users
} from 'lucide-react';
import './DoctorQueue.css';

export function DoctorQueue() {
  const { success, error: toastError } = useToast();

  const [queueData, setQueueData] = useState({ appointments: [], stats: {} });
  const [loading, setLoading] = useState(true);

  // Active consultation drawer state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/doctor/queue');
      if (res.success) {
        setQueueData(res.data);
      }
    } catch (err) {
      toastError(err.message || 'Failed to fetch clinic queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenConsultation = async (appt) => {
    // If status is CHECKED_IN, automatically advance to IN_CONSULTATION optimistically
    if (appt.status === 'CHECKED_IN') {
      try {
        await api.patch(`/appointments/${appt._id}/status`, { status: 'IN_CONSULTATION' });
        appt.status = 'IN_CONSULTATION';
      } catch (e) {
        console.error(e);
      }
    }

    setSelectedAppointment(appt);
    setShowDrawer(true);
  };

  const appointments = queueData.appointments || [];
  const stats = queueData.stats || {};

  // Active patient in room (first with IN_CONSULTATION)
  const activeInRoom = appointments.find((a) => a.status === 'IN_CONSULTATION');

  return (
    <div className="doctor-queue-wrapper">
      {/* Header */}
      <div className="doc-queue-header">
        <div>
          <h2>Physician Clinical Console</h2>
          <p>Real-time outpatient consultation queue, active encounter charting, and e-prescriptions.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchQueue} disabled={loading}>
          Refresh Queue
        </Button>
      </div>

      {/* Queue Stat Summary Cards */}
      <div className="queue-stats-grid">
        <div className="q-stat-card">
          <span className="q-stat-lbl">Today's Patients</span>
          <span className="q-stat-num">{stats.totalToday || 0}</span>
        </div>
        <div className="q-stat-card border-amber">
          <span className="q-stat-lbl">Waiting in Triage</span>
          <span className="q-stat-num text-amber">{stats.waiting || 0}</span>
        </div>
        <div className="q-stat-card border-purple">
          <span className="q-stat-lbl">In Consultation</span>
          <span className="q-stat-num text-purple">{stats.inConsultation || 0}</span>
        </div>
        <div className="q-stat-card border-green">
          <span className="q-stat-lbl">Completed Today</span>
          <span className="q-stat-num text-green">{stats.completed || 0}</span>
        </div>
      </div>

      {/* Active in Room Hero Banner */}
      {activeInRoom ? (
        <div className="active-in-room-hero">
          <div className="hero-status-pip">
            <span className="pip-dot" />
            <span>CURRENTLY IN CONSULTATION ROOM</span>
          </div>

          <div className="hero-patient-summary">
            <div>
              <h3>{activeInRoom.patientId?.fullName}</h3>
              <p className="hero-meta">
                MRN: <strong>{activeInRoom.patientId?.mrn}</strong> • Slot: <strong>{activeInRoom.timeSlot}</strong> • Blood: <strong>{activeInRoom.patientId?.bloodGroup || 'N/A'}</strong>
              </p>
              <p className="hero-reason">Chief Complaint: {activeInRoom.reason}</p>
            </div>

            <Button
              id="btn-resume-chart"
              variant="primary"
              size="lg"
              icon={FileEdit}
              onClick={() => handleOpenConsultation(activeInRoom)}
            >
              Open Clinical EMR Chart
            </Button>
          </div>
        </div>
      ) : (
        <div className="no-active-hero">
          <p>No patient currently inside consultation room. Call the next checked-in patient from queue.</p>
        </div>
      )}

      {/* Queue Table */}
      <div className="queue-table-card">
        <div className="queue-table-head">
          <h3>Daily Consultation Queue ({appointments.length})</h3>
          <span className="queue-telemetry-badge">Indexed Aggregation Latency &lt; 40ms</span>
        </div>

        {loading ? (
          <p className="text-muted text-center p-8">Loading real-time queue...</p>
        ) : appointments.length === 0 ? (
          <div className="empty-queue-box">
            <Users size={36} className="text-muted" />
            <h4>No Patients in Queue Today</h4>
            <p>Walk-ins and booked visits will populate here automatically.</p>
          </div>
        ) : (
          <table className="doctor-queue-table">
            <thead>
              <tr>
                <th>Queue #</th>
                <th>Slot</th>
                <th>Patient Name</th>
                <th>MRN / Phone</th>
                <th>Allergies Alert</th>
                <th>Status</th>
                <th>Clinical Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const isWaiting = appt.status === 'CHECKED_IN';
                const isUnderway = appt.status === 'IN_CONSULTATION';
                const isCompleted = appt.status === 'COMPLETED';
                const allergies = appt.patientId?.allergies || [];

                return (
                  <tr
                    key={appt._id}
                    className={`queue-row ${isUnderway ? 'row-in-consult' : ''}`}
                  >
                    <td>
                      <span className="q-serial">#{appt.queueNumber}</span>
                    </td>
                    <td className="font-bold">{appt.timeSlot}</td>
                    <td>
                      <div className="q-p-meta">
                        <span className="q-p-name">{appt.patientId?.fullName}</span>
                        <span className="q-p-reason">{appt.reason}</span>
                      </div>
                    </td>
                    <td>
                      <span className="mrn-code">{appt.patientId?.mrn}</span>
                    </td>
                    <td>
                      {allergies.length > 0 ? (
                        <span className="queue-allergy-alert" title={allergies.join(', ')}>
                          <AlertTriangle size={12} /> {allergies[0]} {allergies.length > 1 ? `(+${allergies.length - 1})` : ''}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={appt.status} />
                    </td>
                    <td>
                      <div className="q-actions-row">
                        {isWaiting && (
                          <button
                            id={`btn-call-next-${appt._id}`}
                            className="btn-q-call"
                            onClick={() => handleOpenConsultation(appt)}
                          >
                            <PlayCircle size={14} /> Call Patient
                          </button>
                        )}
                        {isUnderway && (
                          <button
                            className="btn-q-resume"
                            onClick={() => handleOpenConsultation(appt)}
                          >
                            <FileEdit size={14} /> Edit Chart
                          </button>
                        )}
                        {isCompleted && (
                          <span className="text-muted text-sm font-semibold">Done</span>
                        )}
                        {appt.status === 'SCHEDULED' && (
                          <span className="text-muted text-sm">Awaiting Triage</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Consultation Drawer */}
      <DoctorConsultationDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        appointment={selectedAppointment}
        onSuccess={() => {
          setShowDrawer(false);
          fetchQueue();
        }}
      />
    </div>
  );
}
