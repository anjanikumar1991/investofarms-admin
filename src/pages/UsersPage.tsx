import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { AdminUserFull } from '../types';

const ROLES = ['INVESTOR', 'SUPERVISOR', 'ADMIN'];

const kycColors: Record<string, string> = {
  verified: 'green',
  pending: 'gold',
  rejected: 'red',
  not_submitted: 'grey',
};

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserFull[]>([]);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadUsers = async () => {
    const response = await api.get('/admin/users/');
    setUsers(unwrap<AdminUserFull[]>(response) || []);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (user: AdminUserFull, newRole: string) => {
    setUpdatingId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.phone || '').includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <section>
      <div className="page-header">
        <span>User Management</span>
        <h1>All Users</h1>
        <p>View investor accounts and manage access roles.</p>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <Users size={22} />
          <span>Total Users</span>
          <strong>{users.length}</strong>
        </div>
        <div className="stat-card">
          <Users size={22} />
          <span>Investors</span>
          <strong>{users.filter(u => u.role?.toUpperCase() === 'INVESTOR').length}</strong>
        </div>
        <div className="stat-card">
          <Users size={22} />
          <span>KYC Verified</span>
          <strong>{users.filter(u => u.is_kyc_verified).length}</strong>
        </div>
        <div className="stat-card">
          <Users size={22} />
          <span>Profile Complete</span>
          <strong>{users.filter(u => u.is_profile_completed).length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={18} color="#75664b" />
          <input
            style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 15 }}
            placeholder="Search by phone, name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ color: '#75664b', fontSize: 13, fontWeight: 700 }}>{filtered.length} users</span>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Phone</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>KYC Status</th>
                <th>Profile</th>
                <th>KYC Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#75664b', padding: 32 }}>
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map(user => (
                <tr key={user.id}>
                  <td style={{ color: '#75664b', fontSize: 13 }}>{user.id}</td>
                  <td style={{ fontWeight: 700 }}>{user.phone || '—'}</td>
                  <td>{user.full_name || <span style={{ color: '#aaa' }}>Not set</span>}</td>
                  <td style={{ fontSize: 13, color: '#75664b' }}>{user.email || '—'}</td>
                  <td>
                    <select
                      value={user.role?.toUpperCase()}
                      disabled={updatingId === user.id}
                      onChange={e => handleRoleChange(user, e.target.value)}
                      style={{
                        border: '1.5px solid',
                        borderColor:
                          user.role?.toUpperCase() === 'ADMIN' ? '#174a2a' :
                          user.role?.toUpperCase() === 'SUPERVISOR' ? '#c8963e' : '#e2d7c3',
                        borderRadius: 10,
                        padding: '5px 10px',
                        fontWeight: 800,
                        fontSize: 12,
                        color:
                          user.role?.toUpperCase() === 'ADMIN' ? '#174a2a' :
                          user.role?.toUpperCase() === 'SUPERVISOR' ? '#9a6500' : '#555',
                        background: 'white',
                        cursor: 'pointer',
                        opacity: updatingId === user.id ? 0.5 : 1,
                      }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${kycColors[user.kyc_status || 'not_submitted'] || 'grey'}`}
                      style={user.kyc_status === 'rejected' ? { background: '#ffeaea', color: '#9f1d1d' } : {}}>
                      {(user.kyc_status || 'not_submitted').replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 18 }}>{user.is_profile_completed ? '✅' : '⬜'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 18 }}>{user.is_kyc_verified ? '✅' : '⬜'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
