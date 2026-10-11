import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  LayoutDashboard,
  Stethoscope,
  PlusCircle,
  Activity,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import './Sidebar.css';

export function Sidebar({ currentTab, onTabChange, isOpen, onClose }) {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Role-tailored navigation items
  const navItems = [];

  if (role === 'PATIENT') {
    navItems.push(
      { id: 'patient-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'patient-book', label: 'Book Appointment', icon: PlusCircle },
      { id: 'patient-records', label: 'Medical History & Rx', icon: FileText }
    );
  } else if (role === 'DOCTOR') {
    navItems.push(
      { id: 'doctor-queue', label: "Today's Patient Queue", icon: Clock },
      { id: 'doctor-history', label: 'Past Consultations', icon: Stethoscope }
    );
  } else if (role === 'STAFF') {
    navItems.push(
      { id: 'staff-appointments', label: 'Master Triage Grid', icon: Calendar },
      { id: 'staff-patients', label: 'Patient Directory', icon: Users }
    );
  } else if (role === 'ADMIN') {
    navItems.push(
      { id: 'admin-overview', label: 'Hospital Telemetry', icon: Activity },
      { id: 'admin-users', label: 'Provider & Staff Directory', icon: Users },
      { id: 'admin-audit', label: 'Compliance Audit Logs', icon: ShieldCheck },
      { id: 'staff-appointments', label: 'Triage Grid View', icon: Calendar }
    );
  }

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-role-indicator">
          <span className="role-chip">{role} PORTAL</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">MAIN NAVIGATION</div>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    id={`nav-link-${item.id}`}
                    className={`nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onTabChange(item.id);
                      if (onClose) onClose();
                    }}
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    {isActive && <span className="active-pip" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="system-pill">
            <span className="version-tag">CarePulse v1.0.0</span>
            <span className="latency-indicator">P95 &lt; 150ms</span>
          </div>
        </div>
      </aside>
    </>
  );
}
