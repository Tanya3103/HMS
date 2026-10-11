import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import { Search, User, Phone, AlertCircle, RefreshCw } from 'lucide-react';

export function StaffPatientDirectory() {
  const { error: toastError } = useToast();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchPatients = async (searchTerm = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/staff/patients/search?query=${encodeURIComponent(searchTerm)}`);
      if (res.success) {
        setPatients(res.data.patients || []);
      }
    } catch (err) {
      toastError('Failed to load patient directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hospital Patient Directory</h2>
          <p>Lookup registered patient demographic records, Medical Record Numbers (MRN), and emergency contacts.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={() => fetchPatients(query)}>
          Refresh
        </Button>
      </div>

      <div style={{ maxWidth: '400px' }}>
        <InputField
          id="search-directory-input"
          icon={Search}
          placeholder="Search by patient name, phone, or MRN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid-table-container">
        {loading ? (
          <p className="text-muted p-8 text-center" style={{ padding: '32px', textAlign: 'center' }}>
            Searching patient directory...
          </p>
        ) : patients.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Search size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>No Patients Found</h4>
            <p style={{ fontSize: '13px' }}>Try searching by another name, contact number, or medical record number (MRN).</p>
          </div>
        ) : (
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Full Name</th>
                <th>Contact Phone</th>
                <th>Gender / Blood</th>
                <th>Emergency Contact</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p._id}>
                  <td className="font-bold" style={{ color: 'var(--color-primary)' }}>{p.mrn}</td>
                  <td className="font-semibold">{p.fullName}</td>
                  <td>{p.phone}</td>
                  <td>{p.gender} • <strong style={{ color: '#DC2626' }}>{p.bloodGroup || 'N/A'}</strong></td>
                  <td>
                    {p.emergencyContact?.name ? (
                      <span>{p.emergencyContact.name} ({p.emergencyContact.relationship || 'Contact'})</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
