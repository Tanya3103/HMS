import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { ShieldCheck, RefreshCw, Clock } from 'lucide-react';

export function AdminAuditLogs() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      toastError('Failed to fetch audit trails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Clinical Audit Trails &amp; Compliance Logs</h2>
          <p>Append-only traceability records tracking patient record access, status mutations, and security events.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchLogs} disabled={loading}>
          Refresh Audit Trail
        </Button>
      </div>

      <div className="grid-table-container">
        {loading ? (
          <p className="text-muted p-8 text-center" style={{ padding: '32px', textAlign: 'center' }}>
            Loading compliance logs...
          </p>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ShieldCheck size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>No Audit Log Entries</h4>
            <p style={{ fontSize: '13px' }}>HIPAA compliance actions will be recorded here automatically.</p>
          </div>
        ) : (
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor Role</th>
                <th>Actor Account</th>
                <th>Action Verb</th>
                <th>Resource Target</th>
                <th>Details Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="text-muted text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className={`role-badge-tag role-${log.actorRole?.toLowerCase()}`}>
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="font-semibold">{log.actorId?.email || 'System Daemon'}</td>
                  <td>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '12px' }}>
                      {log.action}
                    </strong>
                  </td>
                  <td>{log.resourceType}</td>
                  <td>
                    <span className="font-mono text-xs text-muted" style={{ fontSize: '11px' }}>
                      {log.details ? JSON.stringify(log.details).slice(0, 70) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
