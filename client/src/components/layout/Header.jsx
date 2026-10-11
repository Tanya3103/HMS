import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, LogOut, ShieldCheck, User } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import './Header.css';

export function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <Activity size={20} className="pulse-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">CarePulse</span>
            <span className="brand-subtitle">HMS Portal</span>
          </div>
        </div>

        <div className="system-health-badge">
          <span className="health-dot" />
          <span className="health-text">On-Device Engine Active</span>
        </div>
      </div>

      <div className="header-right">
        {user && (
          <div className="user-profile-widget">
            <div className="user-avatar">
              <User size={18} />
            </div>
            <div className="user-meta">
              <span className="user-name">{user.name || user.email}</span>
              <span className="user-role-tag">{user.role}</span>
            </div>
            <button
              id="btn-header-logout"
              className="logout-action-btn"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="logout-text">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
