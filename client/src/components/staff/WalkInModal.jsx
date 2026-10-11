import React, { useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';
import { UserCheck } from 'lucide-react';

export function WalkInModal({ isOpen, onClose, doctors, onSuccess }) {
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [doctorId, setDoctorId] = useState(doctors[0]?._id || '');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [reason, setReason] = useState('Emergency / Acute Walk-In Consultation');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !phone || !doctorId) {
      toastError('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/staff/patients/walkin', {
        fullName,
        phone,
        gender,
        bloodGroup,
        doctorId,
        timeSlot,
        reason
      });

      if (res.success) {
        success('Walk-in patient registered and checked into queue!');
        onSuccess();
      }
    } catch (err) {
      toastError(err.message || 'Failed to register walk-in patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Walk-In Patient Registration"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            id="btn-submit-walkin"
            variant="primary"
            loading={loading}
            icon={UserCheck}
            onClick={handleSubmit}
          >
            Check In Patient
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          id="walkin-name"
          label="Patient Full Name"
          placeholder="e.g. Michael Chang"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <InputField
            id="walkin-phone"
            label="Contact Phone"
            placeholder="+1 (555) 0987"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div className="input-group">
            <label className="input-label">Blood Group</label>
            <select
              className="input-control"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Assign Doctor</label>
            <select
              className="input-control"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullName} ({d.department} - {d.roomNumber})
                </option>
              ))}
            </select>
          </div>

          <InputField
            id="walkin-slot"
            label="Allocated Time Slot"
            placeholder="10:00"
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            required
          />
        </div>

        <InputField
          id="walkin-reason"
          label="Triage / Chief Complaint"
          placeholder="Reason for walk-in consultation..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </form>
    </Modal>
  );
}
