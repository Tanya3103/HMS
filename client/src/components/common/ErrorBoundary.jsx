import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CarePulse Crash Guard caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Clear potentially corrupted local session and reload
    localStorage.removeItem('carepulse_access_token');
    localStorage.removeItem('carepulse_refresh_token');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <AlertTriangle size={36} />
            </div>

            <h2 className="error-boundary-title">Clinical System Interface Recovery</h2>
            <p className="error-boundary-desc">
              The application encountered an unexpected runtime exception. All on-device database records and patient clinical data remain completely safe and intact.
            </p>

            {this.state.error && (
              <div className="error-details-box">
                <code>{this.state.error.toString()}</code>
              </div>
            )}

            <div className="error-boundary-actions">
              <button
                id="btn-error-reload"
                className="btn-recovery-primary"
                onClick={this.handleReload}
              >
                <RefreshCw size={16} />
                Refresh Clinic App
              </button>
              <button
                id="btn-error-reset"
                className="btn-recovery-secondary"
                onClick={this.handleReset}
              >
                <Home size={16} />
                Return to Login Gateway
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
