import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { InvestmentTransaction, UserProject } from '../types';

type Tab = 'transactions' | 'interests';

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  expired: 'gray',
  active: 'green',
  interested: 'gold',
  payment_pending: 'gold',
  payment_failed: 'red',
};

function statusBadge(status: string) {
  const color = STATUS_COLORS[status] ?? 'gray';
  return <span className={`badge ${color}`}>{status.replace('_', ' ')}</span>;
}

function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtINR(n: number | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [interests, setInterests] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [upiRef, setUpiRef] = useState('');
  const [approveModal, setApproveModal] = useState<InvestmentTransaction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [txns, ups] = await Promise.all([
        api.get('/admin/investments/transactions').then(r => r?.data?.data ?? r?.data ?? []),
        api.get('/admin/investments/').then(r => r?.data?.data ?? r?.data ?? []),
      ]);
      setTransactions(txns);
      setInterests(ups);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approveModal) return;
    setActionLoading(approveModal.id);
    try {
      await api.post(`/admin/investments/transactions/${approveModal.id}/approve`, { upi_reference: upiRef || undefined });
      setApproveModal(null);
      setUpiRef('');
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(txn: InvestmentTransaction) {
    if (!confirm(`Reject payment from ${txn.user_name || txn.user_phone}?`)) return;
    setActionLoading(txn.id);
    try {
      await api.post(`/admin/investments/transactions/${txn.id}/reject`, {});
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <span>Payments</span>
        <h1>Investment Payments</h1>
        <p>Approve or reject investor documentation fee payments and track interest.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending Approvals', value: pendingCount, accent: '#b45309' },
          { label: 'Approved', value: transactions.filter(t => t.status === 'approved').length, accent: '#16a34a' },
          { label: 'Interested Users', value: interests.length, accent: '#2563eb' },
          { label: 'Active Investments', value: interests.filter(i => i.status === 'active').length, accent: '#15803d' },
        ].map(card => (
          <div key={card.label} className="panel" style={{ flex: '1 1 160px', minWidth: 160, borderTop: `3px solid ${card.accent}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.accent }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['transactions', 'interests'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1.5px solid',
              borderColor: tab === t ? '#15803d' : '#ddd',
              background: tab === t ? '#15803d' : 'white',
              color: tab === t ? 'white' : '#333',
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >
            {t === 'transactions' ? `Transactions${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` : 'Interested Users'}
          </button>
        ))}
        <button onClick={fetchAll} disabled={loading} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontSize: 13 }}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                {['#', 'User', 'Project', 'Plots / Acres', 'Amount', 'Status', 'Session Expires', 'UPI Ref', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#444', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No transactions yet.</td></tr>
              )}
              {transactions.map(txn => {
                const isExpired = txn.status === 'pending' && new Date() > new Date(txn.session_expires_at);
                return (
                  <tr key={txn.id} style={{ borderBottom: '1px solid #f0f0f0', background: isExpired ? '#fafafa' : undefined }}>
                    <td style={{ padding: '10px 12px', color: '#999', fontSize: 12 }}>{txn.id}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{txn.user_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{txn.user_phone}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{txn.project_name || `Project #${txn.project_id}`}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div>{txn.plot_size ?? '—'} plots</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{txn.total_acres != null ? `${txn.total_acres} ac` : ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtINR(txn.amount)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {isExpired ? <span className="badge gray">expired (client)</span> : statusBadge(txn.status)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: isExpired ? '#e53e3e' : '#555' }}>
                      {fmtDate(txn.session_expires_at)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{txn.upi_reference || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{fmtDate(txn.created_at)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {txn.status === 'pending' && !isExpired ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setApproveModal(txn)}
                            disabled={actionLoading === txn.id}
                            style={{ padding: '5px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(txn)}
                            disabled={actionLoading === txn.id}
                            className="danger-button"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#aaa' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interests tab */}
      {tab === 'interests' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                {['#', 'User', 'Project', 'Plots', 'Acres', 'Investment Cost', 'Doc Fee', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#444' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interests.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No interest records yet.</td></tr>
              )}
              {interests.map(up => (
                <tr key={up.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', color: '#999', fontSize: 12 }}>{up.id}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700 }}>{up.user_name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{up.user_phone}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{up.project_name || `Project #${up.project_id}`}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{up.plot_size}</td>
                  <td style={{ padding: '10px 12px' }}>{up.total_acres} ac</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtINR(up.cost)}</td>
                  <td style={{ padding: '10px 12px' }}>{fmtINR(up.documentation_fee)}</td>
                  <td style={{ padding: '10px 12px' }}>{statusBadge(up.status)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{fmtDate(up.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: 420, maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: 12 }}>Approve Payment</h3>
            <p style={{ marginBottom: 8, fontSize: 14 }}>
              Approving <strong>{fmtINR(approveModal.amount)}</strong> from{' '}
              <strong>{approveModal.user_name || approveModal.user_phone}</strong> for{' '}
              <strong>{approveModal.project_name}</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              Optionally enter the UPI/UTR reference number for your records.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>UPI / UTR Reference (optional)</label>
            <input
              value={upiRef}
              onChange={e => setUpiRef(e.target.value)}
              placeholder="e.g. 123456789012"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 18, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setApproveModal(null); setUpiRef(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleApprove}
                disabled={actionLoading === approveModal.id}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                {actionLoading === approveModal.id ? 'Approving…' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
