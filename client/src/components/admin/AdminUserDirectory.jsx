import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { InputField } from '../common/InputField';
import { Users, UserPlus, RefreshCw, Power } from 'lucide-react';
import './AdminUserDirectory.css';

export function AdminUserDirectory() {
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('ALL');

  // New Provider Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Hospital@123');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('DOCTOR');
  const [newDept, setNewDept] = useState('Cardiology');
  const [newRoom, setNewRoom] = useState('Room 102');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      toastError('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const res = await api.patch(`/admin/users/${user._id}/status`);
      if (res.success) {
        success(`User status updated to ${res.data.isActive ? 'Active' : 'Disabled'}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: res.data.isActive } : u))
        );
      }
    } catch (err) {
      toastError(err.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newFullName) {
      toastError('Please fill in required fields');
      return;
    }

    setAddLoading(true);
    try {
      const res = await api.post('/admin/users', {
        email: newEmail,
        password: newPassword,
        role: newRole,
        fullName: newFullName,
        department: newDept,
        roomNumber: newRoom
      });

      if (res.success) {
        success(`New ${newRole} account created successfully!`);
        setShowAddModal(false);
        fetchUsers();
      }
    } catch (err) {
      toastError(err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredUsers = filterRole === 'ALL'
    ? users
    : users.filter((u) => u.role === filterRole);

  return (
    <div className="admin-users-wrapper">
      <div className="admin-user-header">
        <div>
          <h2>Hospital Provider &amp; Staff Directory</h2>
          <p>Role-based access permissions, account provisioning, and credential governance.</p>
        </div>
        <div className="admin-actions-bar">
          <Button variant="outline" icon={RefreshCw} onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
          <Button
            id="btn-add-provider"
            variant="primary"
            icon={UserPlus}
            onClick={() => setShowAddModal(true)}
          >
            + Provision Provider / Staff
          </Button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="role-filter-pills">
        {['ALL', 'DOCTOR', 'STAFF', 'PATIENT', 'ADMIN'].map((role) => (
          <button
            key={role}
            className={`role-filter-btn ${filterRole === role ? 'active' : ''}`}
            onClick={() => setFilterRole(role)}
          >
            {role === 'ALL' ? 'All Roles' : `${role}s`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="grid-table-container">
        {loading ? (
          <p className="text-muted p-8 text-center" style={{ padding: '32px', textAlign: 'center' }}>Loading users directory...</p>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>No User Accounts Found</h4>
            <p style={{ fontSize: '13px' }}>No accounts matched the selected role filter.</p>
          </div>
        ) : (
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Role</th>
                <th>Full Name / Department</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Account Controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td className="font-semibold">{u.email}</td>
                  <td>
                    <span className={`role-badge-tag role-${u.role.toLowerCase()}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold">{u.profile?.fullName || '—'}</span>
                      {u.profile?.department && (
                        <span className="text-muted text-xs">
                          {u.profile.department} ({u.profile.roomNumber || 'Clinic'})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={u.isActive ? 'ACTIVE' : 'DISABLED'}
                      customLabel={u.isActive ? 'Active' : 'Disabled'}
                    />
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn-toggle-user ${u.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                      onClick={() => handleToggleStatus(u)}
                    >
                      <Power size={13} /> {u.isActive ? 'Disable' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Provisioning Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Provision New Provider or Staff Account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button
              id="btn-confirm-provision"
              variant="primary"
              loading={addLoading}
              onClick={handleCreateUser}
            >
              Provision Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Select System Role *</label>
            <select
              className="input-control"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="DOCTOR">Doctor (Attending Physician)</option>
              <option value="STAFF">Staff (Reception / Triage)</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          <InputField
            id="prov-name"
            label="Full Legal Name *"
            placeholder="e.g. Dr. Jennifer Davis"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            required
          />

          <InputField
            id="prov-email"
            label="Account Email Address *"
            type="email"
            placeholder="jennifer.davis@carepulse.local"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />

          <InputField
            id="prov-pwd"
            label="Temporary Initial Password *"
            placeholder="Hospital@123"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {newRole === 'DOCTOR' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">Department</label>
                <select
                  className="input-control"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                </select>
              </div>

              <InputField
                id="prov-room"
                label="Room Number"
                placeholder="Room 102"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
