import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthGateway } from './components/auth/AuthGateway';
import { AppLayout } from './components/layout/AppLayout';
import { OfflineBanner } from './components/common/OfflineBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Module Components
import { PatientDashboard } from './components/patient/PatientDashboard';
import { PatientBookAppointment } from './components/patient/PatientBookAppointment';
import { PatientRecords } from './components/patient/PatientRecords';
import { DoctorQueue } from './components/doctor/DoctorQueue';
import { StaffAppointmentGrid } from './components/staff/StaffAppointmentGrid';
import { StaffPatientDirectory } from './components/staff/StaffPatientDirectory';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminUserDirectory } from './components/admin/AdminUserDirectory';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';

import { HeartPulse } from 'lucide-react';
import './App.css';

function MainPortalRouter() {
  const { user, isAuthenticated, loading } = useAuth();

  const getDefaultTab = (role) => {
    switch (role) {
      case 'DOCTOR': return 'doctor-queue';
      case 'STAFF': return 'staff-appointments';
      case 'ADMIN': return 'admin-overview';
      case 'PATIENT':
      default: return 'patient-dashboard';
    }
  };

  const [currentTab, setCurrentTab] = useState('patient-dashboard');

  useEffect(() => {
    if (user) {
      setCurrentTab(getDefaultTab(user.role));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="portal-loading-screen">
        <HeartPulse size={48} className="pulse-loader" />
        <p className="loading-text">Connecting to CarePulse On-Device Engine...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGateway />;
  }

  // Render feature component based on active navigation tab
  const renderTabContent = () => {
    switch (currentTab) {
      // Patient Portal
      case 'patient-dashboard':
        return <PatientDashboard onNavigateTab={setCurrentTab} />;
      case 'patient-book':
        return <PatientBookAppointment onNavigateTab={setCurrentTab} />;
      case 'patient-records':
        return <PatientRecords />;

      // Doctor Portal
      case 'doctor-queue':
      case 'doctor-history':
        return <DoctorQueue />;

      // Staff / Reception Desk
      case 'staff-appointments':
        return <StaffAppointmentGrid />;
      case 'staff-patients':
        return <StaffPatientDirectory />;

      // Admin Console
      case 'admin-overview':
        return <AdminOverview />;
      case 'admin-users':
        return <AdminUserDirectory />;
      case 'admin-audit':
        return <AdminAuditLogs />;

      default:
        return <PatientDashboard onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderTabContent()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <OfflineBanner />
          <MainPortalRouter />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
