import { useEffect, useState } from 'react';
import { Check, X, Search, FileText, Download, AlertCircle } from 'lucide-react';
import { api, unwrap } from '../api/client';

interface KYCDocument {
  type: string;
  number: string;
  file_url: string;
}

interface PendingKYC {
  id: number;
  user_id: number;
  user_name: string;
  user_phone: string;
  full_name: string;
  dob: string;
  address: string;
  submitted_at: string;
  documents: KYCDocument[];
}

export function KYCApprovalPage() {
  const [pendingKYCs, setPendingKYCs] = useState<PendingKYC[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKYC, setSelectedKYC] = useState<PendingKYC | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadPendingKYCs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/kyc/pending');
      setPendingKYCs(unwrap<PendingKYC[]>(response) || []);
    } catch (err) {
      console.error('Failed to load pending KYCs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPendingKYCs(); }, []);

  const handleApprove = async () => {
    if (!selectedKYC) return;
    setProcessing(true);
    try {
      await api.post('/v1/kyc/approve', {
        kyc_profile_id: selectedKYC.id,
        status: 'verified',
      });
      await loadPendingKYCs();
      setSelectedKYC(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to approve KYC');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedKYC) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setProcessing(true);
    try {
      await api.post('/v1/kyc/approve', {
        kyc_profile_id: selectedKYC.id,
        status: 'rejected',
        rejection_reason: rejectionReason,
      });
      await loadPendingKYCs();
      setSelectedKYC(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to reject KYC');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <section>
      <div className="page-header">
        <span>KYC Management</span>
        <h1>Pending KYC Submissions</h1>
        <p>Review and approve or reject investor KYC documents.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <FileText size={22} />
          <span>Pending</span>
          <strong>{pendingKYCs.length}</strong>
        </div>
        <div className="stat-card">
          <Check size={22} />
          <span>Approved Today</span>
          <strong>0</strong>
        </div>
        <div className="stat-card">
          <X size={22} />
          <span>Rejected Today</span>
          <strong>0</strong>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          Loading pending KYC submissions...
        </div>
      ) : pendingKYCs.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <FileText size={48} color="#75664b" style={{ marginBottom: 16 }} />
          <p style={{ color: '#75664b' }}>No pending KYC submissions</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Full Name</th>
                  <th>Submitted</th>
                  <th>Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingKYCs.map(kyc => (
                  <tr key={kyc.id}>
                    <td>
                      <div>
                        <strong>{kyc.user_name}</strong>
                        <div style={{ fontSize: 12, color: '#75664b' }}>ID: {kyc.user_id}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{kyc.user_phone}</td>
                    <td>{kyc.full_name}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(kyc.submitted_at)}</td>
                    <td>
                      <span style={{ fontSize: 13 }}>{kyc.documents.length} files</span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedKYC(kyc)}
                        style={{
                          background: '#174a2a',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedKYC && (
        <div className="modal-overlay" onClick={() => setSelectedKYC(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>KC Review - {selectedKYC.user_name}</h2>
              <button
                onClick={() => setSelectedKYC(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: 600, overflowY: 'auto' }}>
              {/* User Info */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12, fontSize: 14, color: '#75664b', textTransform: 'uppercase' }}>
                  User Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#75664b', fontWeight: 700 }}>Phone</label>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedKYC.user_phone}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#75664b', fontWeight: 700 }}>User ID</label>
                    <div style={{ fontSize: 14 }}>{selectedKYC.user_id}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#75664b', fontWeight: 700 }}>Full Name</label>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedKYC.full_name}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#75664b', fontWeight: 700 }}>Date of Birth</label>
                    <div style={{ fontSize: 14 }}>{formatDate(selectedKYC.dob)}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 12, color: '#75664b', fontWeight: 700 }}>Address</label>
                    <div style={{ fontSize: 14 }}>{selectedKYC.address}</div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12, fontSize: 14, color: '#75664b', textTransform: 'uppercase' }}>
                  Documents
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedKYC.documents.map((doc, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2d7c3', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong style={{ fontSize: 14 }}>{doc.type}</strong>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#174a2a',
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                      <div style={{ fontSize: 13, color: '#75664b' }}>
                        Number: {doc.number}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection Reason */}
              <div>
                <h3 style={{ marginBottom: 12, fontSize: 14, color: '#75664b', textTransform: 'uppercase' }}>
                  Rejection Reason (if rejecting)
                </h3>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 12,
                    border: '1px solid #e2d7c3',
                    borderRadius: 12,
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedKYC(null)}
                style={{
                  background: 'white',
                  color: '#75664b',
                  border: '1px solid #e2d7c3',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  background: '#ffeaea',
                  color: '#9f1d1d',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  background: '#174a2a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
