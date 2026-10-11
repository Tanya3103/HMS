import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Activity, Lock, Mail, User, Eye, EyeOff, ShieldCheck, HeartPulse } from 'lucide-react';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';
import './AuthGateway.css';

export function AuthGateway() {
  const { login, registerPatient } = useAuth();
  const { success, error: toastError } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [allergiesText, setAllergiesText] = useState('');

  // 1-Click Demo Credential Selector
  const fillDemoCredentials = (roleEmail, rolePwd) => {
    setEmail(roleEmail);
    setPassword(rolePwd);
    setMode('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        success(`Welcome back, ${user.name || user.email}!`);
      } else {
        const allergies = allergiesText
          ? allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        const user = await registerPatient({
          email,
          password,
          fullName,
          phone,
          dateOfBirth: dob,
          gender,
          bloodGroup,
          allergies
        });
        success(`Registration complete! Welcome to CarePulse, ${user.name}`);
      }
    } catch (err) {
      toastError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gateway-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand-head">
          <div className="auth-logo-badge">
            <HeartPulse size={28} className="auth-pulse-icon" />
          </div>
          <h1 className="auth-title">CarePulse HMS</h1>
          <p className="auth-subtitle">Enterprise Healthcare Management & Clinical Portal</p>
        </div>

        {/* Demo Fast-Switch Buttons */}
        <div className="demo-credentials-bar">
          <span className="demo-label">⚡ 1-Click Demo Access:</span>
          <div className="demo-pills-row">
            <button
              type="button"
              className="demo-pill pill-doctor"
              onClick={() => fillDemoCredentials('doctor.rajesh@carepulse.local', 'Doctor@123')}
            >
              Doctor (Cardio)
            </button>
            <button
              type="button"
              className="demo-pill pill-staff"
              onClick={() => fillDemoCredentials('staff.elena@carepulse.local', 'Staff@123')}
            >
              Staff (Triage)
            </button>
            <button
              type="button"
              className="demo-pill pill-patient"
              onClick={() => fillDemoCredentials('patient.sarah@carepulse.local', 'Patient@123')}
            >
              Patient (Sarah)
            </button>
            <button
              type="button"
              className="demo-pill pill-admin"
              onClick={() => fillDemoCredentials('admin@carepulse.local', 'Admin@123')}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In to Portal
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            New Patient Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <InputField
                id="reg-fullname"
                label="Full Legal Name"
                icon={User}
                placeholder="e.g. Sarah Connor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="form-row-2">
                <InputField
                  id="reg-phone"
                  label="Contact Phone"
                  placeholder="+1 (555) 0123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <InputField
                  id="reg-dob"
                  label="Date of Birth"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="input-group">
                  <label htmlFor="reg-gender" className="input-label">Gender *</label>
                  <select
                    id="reg-gender"
                    className="input-control"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="reg-blood" className="input-label">Blood Group</label>
                  <select
                    id="reg-blood"
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

              <InputField
                id="reg-allergies"
                label="Documented Drug Allergies"
                placeholder="e.g. Penicillin, Peanuts (comma separated)"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                helperText="Leave blank if no known allergies"
              />
            </>
          )}

          <InputField
            id="auth-email"
            label="Hospital / Patient Email"
            type="email"
            icon={Mail}
            placeholder="name@carepulse.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-field-container">
            <InputField
              id="auth-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pwd-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            id="btn-auth-submit"
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="auth-submit-btn"
          >
            {mode === 'login' ? 'Sign In to Portal' : 'Create Patient Account'}
          </Button>
        </form>

        <div className="auth-footer-badge">
          <ShieldCheck size={14} className="shield-icon" />
          <span>On-device cryptographic RBAC protection • Zero external cloud egress</span>
        </div>
      </div>
    </div>
  );
}
