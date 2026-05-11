import { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api/client';
import { CustomerPayout, FarmProject, ProjectPayoutSchedule, UserProject } from '../types';

const TXN_TYPES = ['upi', 'neft', 'imps', 'cheque', 'cash'];

function fmtINR(n: number | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badge(value: string) {
  const color = value === 'delayed' ? 'red' : value === 'early' ? 'gold' : 'green';
  return <span className={`badge ${color}`}>{value.replace('_', ' ')}</span>;
}

export function PayoutsPage() {
  const [projects, setProjects] = useState<FarmProject[]>([]);
  const [investments, setInvestments] = useState<UserProject[]>([]);
  const [schedules, setSchedules] = useState<ProjectPayoutSchedule[]>([]);
  const [payouts, setPayouts] = useState<CustomerPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payoutForm, setPayoutForm] = useState({ user_id: '', user_project_id: '', schedule_id: '', amount: '', paid_date: '', transaction_id: '', transaction_type: 'neft', notes: '' });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [projectRows, investmentRows, scheduleRows, payoutRows] = await Promise.all([
        api.get('/admin/farm-projects/').then(unwrap<FarmProject[]>),
        api.get('/admin/investments/').then(unwrap<UserProject[]>),
        api.get('/admin/payouts/schedules').then(unwrap<ProjectPayoutSchedule[]>),
        api.get('/admin/payouts/customer-payouts').then(unwrap<CustomerPayout[]>),
      ]);
      setProjects(projectRows || []);
      setInvestments(investmentRows || []);
      setSchedules(scheduleRows || []);
      setPayouts(payoutRows || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }

  const payoutUsers = useMemo(() => {
    const map = new Map<number, UserProject>();
    investments.forEach(item => {
      if (!map.has(item.user_id)) {
        map.set(item.user_id, item);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.user_name || a.user_phone || '').localeCompare(b.user_name || b.user_phone || ''));
  }, [investments]);

  const investmentsForSelectedUser = useMemo(
    () => payoutForm.user_id ? investments.filter(item => String(item.user_id) === payoutForm.user_id) : [],
    [investments, payoutForm.user_id],
  );

  const selectedInvestment = useMemo(
    () => investmentsForSelectedUser.find(item => String(item.id) === payoutForm.user_project_id),
    [investmentsForSelectedUser, payoutForm.user_project_id],
  );

  const schedulesForPayout = useMemo(
    () => selectedInvestment ? schedules.filter(item => item.project_id === selectedInvestment.project_id) : [],
    [schedules, selectedInvestment],
  );

  async function createPayout(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/admin/payouts/customer-payouts', {
        user_project_id: Number(payoutForm.user_project_id),
        schedule_id: Number(payoutForm.schedule_id),
        amount: Number(payoutForm.amount),
        paid_date: payoutForm.paid_date,
        transaction_id: payoutForm.transaction_id,
        transaction_type: payoutForm.transaction_type,
        notes: payoutForm.notes || undefined,
      });
      setPayoutForm({ user_id: '', user_project_id: '', schedule_id: '', amount: '', paid_date: '', transaction_id: '', transaction_type: 'neft', notes: '' });
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? 'Could not record payout');
    }
  }

  async function deletePayout(id: number) {
    if (!confirm('Delete this customer payout record?')) return;
    try {
      await api.delete(`/admin/payouts/customer-payouts/${id}`);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? 'Delete failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <span>Payouts</span>
        <h1>Customer Payout Tracking</h1>
        <p>Configure project payout schedules and record manual payouts sent to investors.</p>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div className="badge green">Customer Payouts</div>
        <button onClick={fetchAll} disabled={loading} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white' }}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div>

      <form className="panel" onSubmit={createPayout} style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Record Customer Payout</h3>
            <div className="form-grid">
              <label>User<select required value={payoutForm.user_id} onChange={e => setPayoutForm(v => ({ ...v, user_id: e.target.value, user_project_id: '', schedule_id: '' }))}><option value="">Select user</option>{payoutUsers.map(i => <option key={i.user_id} value={i.user_id}>{i.user_name || 'Unnamed'} · {i.user_phone || `User #${i.user_id}`}</option>)}</select></label>
              <label>Assigned Project<select required value={payoutForm.user_project_id} onChange={e => setPayoutForm(v => ({ ...v, user_project_id: e.target.value, schedule_id: '' }))} disabled={!payoutForm.user_id}><option value="">Select assigned project</option>{investmentsForSelectedUser.map(i => <option key={i.id} value={i.id}>{i.project_name} · {fmtINR(i.cost)} · {i.status}</option>)}</select></label>
              <label>Schedule<select required value={payoutForm.schedule_id} onChange={e => setPayoutForm(v => ({ ...v, schedule_id: e.target.value }))}><option value="">Select schedule</option>{schedulesForPayout.map(s => <option key={s.id} value={s.id}>{s.label} · {fmtDate(s.scheduled_date)} · {fmtINR(s.expected_amount)}</option>)}</select></label>
              <label>Amount<input required type="number" value={payoutForm.amount} onChange={e => setPayoutForm(v => ({ ...v, amount: e.target.value }))} /></label>
              <label>Paid Date<input required type="date" value={payoutForm.paid_date} onChange={e => setPayoutForm(v => ({ ...v, paid_date: e.target.value }))} /></label>
              <label>Transaction ID<input required value={payoutForm.transaction_id} onChange={e => setPayoutForm(v => ({ ...v, transaction_id: e.target.value }))} /></label>
              <label>Type<select value={payoutForm.transaction_type} onChange={e => setPayoutForm(v => ({ ...v, transaction_type: e.target.value }))}>{TXN_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></label>
              <label className="full-width">Notes<input value={payoutForm.notes} onChange={e => setPayoutForm(v => ({ ...v, notes: e.target.value }))} /></label>
            </div>
            <button className="primary-button" type="submit">Record Payout</button>
      </form>

      <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="data-table"><thead><tr><th>User</th><th>Project</th><th>Schedule</th><th>Amount</th><th>Paid Date</th><th>Txn</th><th>Timing</th><th></th></tr></thead><tbody>
              {payouts.map(item => <tr key={item.id}><td><strong>{item.user_name || '—'}</strong><br /><span>{item.user_phone}</span></td><td>{item.project_name}</td><td>{item.schedule_label}<br /><span>{fmtDate(item.scheduled_date)}</span></td><td>{fmtINR(item.amount)}</td><td>{fmtDate(item.paid_date)}</td><td>{item.transaction_id}<br /><span>{item.transaction_type}</span></td><td>{badge(item.timing)}</td><td><button onClick={() => deletePayout(item.id)}>Delete</button></td></tr>)}
            </tbody></table>
      </div>
    </div>
  );
}
