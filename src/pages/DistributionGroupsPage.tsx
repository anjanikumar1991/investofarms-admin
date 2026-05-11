import { useEffect, useState } from 'react';
import { Users, Plus, Search, FileText, Trash2, Save, X } from 'lucide-react';
import { api, unwrap, API_V1_BASE_URL } from '../api/client';

interface DistributionGroup {
  id: number;
  name: string;
  description: string | null;
  project_id: number | null;
  is_system_group: boolean;
  member_count: number;
  document_count: number;
  created_at: string;
}

interface User {
  id: number;
  phone: string;
  full_name: string | null;
}

interface UserGroupAssignment {
  user_id: number;
  user_name: string;
  user_phone: string;
  group_id: number;
  group_name: string;
  group_description: string | null;
  added_at: string;
  auto_added: boolean;
}

export function DistributionGroupsPage() {
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserGroupAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserGroupModal, setShowUserGroupModal] = useState(false);
  const [showGroupUserModal, setShowGroupUserModal] = useState(false);
  const [selectedUserForGroups, setSelectedUserForGroups] = useState<User | null>(null);
  const [selectedGroupForUsers, setSelectedGroupForUsers] = useState<DistributionGroup | null>(null);
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<number[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingUser, setTogglingUser] = useState<{userId: number, groupId: number} | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/distribution-groups/');
      setGroups(unwrap<DistributionGroup[]>(response) || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users/');
      setUsers(unwrap<User[]>(response) || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadUserAssignments = async () => {
    try {
      const map: Record<number, number[]> = {};
      
      for (const user of users) {
        try {
          const response = await api.get(`/v1/distribution-groups/users/${user.id}/groups`);
          const userGroups = unwrap<any[]>(response) || [];
          // Extract group IDs from the response
          const groupIds = userGroups.map((g: any) => g.group_id);
          if (groupIds.length > 0) {
            map[user.id] = groupIds;
          }
        } catch (err) {
          console.error(`Failed to load groups for user ${user.id}:`, err);
        }
      }
      
      setSelectedGroups(map);
      console.log('Loaded user assignments:', map);
    } catch (err) {
      console.error('Failed to load user assignments:', err);
    }
  };

  useEffect(() => {
    loadGroups();
    loadUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      loadUserAssignments();
    }
  }, [users]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/distribution-groups/', {
        name: newGroupName,
        description: newGroupDesc || null,
      });
      await loadGroups();
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await api.delete(`/v1/distribution-groups/${groupId}`);
      await loadGroups();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete group');
    }
  };

  const handleToggleUserGroup = async (userId: number, groupId: number, add: boolean) => {
    setTogglingUser({ userId, groupId });
    try {
      if (add) {
        await api.post(`/v1/distribution-groups/${groupId}/members`, {
          user_id: userId,
          auto_added: false,
        });
      } else {
        await api.delete(`/v1/distribution-groups/${groupId}/members/${userId}`);
      }
      // Update local state immediately for better UX
      setSelectedGroups(prev => ({
        ...prev,
        [userId]: add 
          ? [...(prev[userId] || []), groupId]
          : (prev[userId] || []).filter(id => id !== groupId)
      }));
      // Then reload to ensure consistency
      await loadUserAssignments();
    } catch (err: any) {
      console.error('Failed to toggle user group:', err);
      alert(err?.response?.data?.detail || 'Failed to update user group assignment');
      // Revert state on error
      await loadUserAssignments();
    } finally {
      setTogglingUser(null);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.phone || '').includes(q) ||
      (u.full_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <section>
      <div className="page-header">
        <span>Distribution Groups</span>
        <h1>Group Management</h1>
        <p>Create distribution groups and assign users for document sharing.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <Users size={22} />
          <span>Total Groups</span>
          <strong>{groups.length}</strong>
        </div>
        <div className="stat-card">
          <Users size={22} />
          <span>Total Users</span>
          <strong>{users.length}</strong>
        </div>
        <div className="stat-card">
          <FileText size={22} />
          <span>System Groups</span>
          <strong>{groups.filter(g => g.is_system_group).length}</strong>
        </div>
        <div className="stat-card">
          <Users size={22} />
          <span>Custom Groups</span>
          <strong>{groups.filter(g => !g.is_system_group).length}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2d7c3' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              background: activeTab === 'users' ? '#174a2a' : 'white',
              color: activeTab === 'users' ? 'white' : '#75664b',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            style={{
              background: activeTab === 'groups' ? '#174a2a' : 'white',
              color: activeTab === 'groups' ? 'white' : '#75664b',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={18} color="#75664b" />
          <input
            style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 15 }}
            placeholder="Search users or groups…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {activeTab === 'groups' && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: '#174a2a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={16} />
                New Group
              </button>
              <button
                onClick={() => {
                  setShowGroupUserModal(true);
                  setSelectedGroupForUsers(null);
                  setSelectedUsersForGroup([]);
                }}
                style={{
                  background: '#c8963e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Users size={16} />
                Add Users to Group
              </button>
            </>
          )}
        </div>
      </div>

      {/* Users Table with Group Assignment */}
      {activeTab === 'users' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 120 }}>Phone</th>
                  <th style={{ minWidth: 150 }}>Full Name</th>
                  <th>Assigned Groups</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#75664b', padding: 32 }}>
                      No users found
                    </td>
                  </tr>
                )}
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 700 }}>{user.phone || '—'}</td>
                    <td>{user.full_name || <span style={{ color: '#aaa' }}>Not set</span>}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                          {groups.slice(0, 3).map(group => {
                            const isAssigned = (selectedGroups[user.id] || []).includes(group.id);
                            const isToggling = togglingUser?.userId === user.id && togglingUser?.groupId === group.id;
                            return (
                              <button
                                key={group.id}
                                onClick={() => handleToggleUserGroup(user.id, group.id, !isAssigned)}
                                disabled={group.is_system_group || isToggling}
                                style={{
                                  background: isAssigned ? '#174a2a' : 'white',
                                  color: isAssigned ? 'white' : '#75664b',
                                  border: isAssigned ? '1px solid #174a2a' : '1px solid #e2d7c3',
                                  borderRadius: 20,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: group.is_system_group || isToggling ? 'not-allowed' : 'pointer',
                                  opacity: group.is_system_group || isToggling ? 0.5 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  transition: 'all 0.2s ease',
                                }}
                                title={group.is_system_group ? 'System group - auto-managed' : isAssigned ? 'Click to remove from group' : 'Click to add to group'}
                              >
                                {group.is_system_group && <Users size={12} />}
                                {isToggling ? '...' : group.name}
                                {isAssigned && !isToggling && <X size={12} />}
                              </button>
                            );
                          })}
                          {(selectedGroups[user.id] || []).length > 3 && (
                            <span style={{ fontSize: 12, color: '#75664b' }}>
                              +{(selectedGroups[user.id] || []).length - 3} more
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUserForGroups(user);
                            setShowUserGroupModal(true);
                          }}
                          style={{
                            background: '#174a2a',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus size={14} />
                          Add Groups
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Groups Table */}
      {activeTab === 'groups' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Members</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#75664b', padding: 32 }}>
                      No groups found
                    </td>
                  </tr>
                )}
                {filteredGroups.map(group => (
                  <tr key={group.id}>
                    <td style={{ fontWeight: 700 }}>{group.name}</td>
                    <td style={{ fontSize: 13, color: '#75664b' }}>{group.description || '—'}</td>
                    <td>
                      <span className={`badge ${group.is_system_group ? 'gold' : 'green'}`}>
                        {group.is_system_group ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td>{group.member_count}</td>
                    <td>{group.document_count}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {!group.is_system_group && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedGroupForUsers(group);
                                // Initialize selectedUsersForGroup with current group members
                                const currentMembers = users
                                  .filter(u => (selectedGroups[u.id] || []).includes(group.id))
                                  .map(u => u.id);
                                setSelectedUsersForGroup(currentMembers);
                                setShowGroupUserModal(true);
                              }}
                              style={{
                                background: '#174a2a',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Users size={12} />
                              Add Users
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              style={{
                                background: '#ffeaea',
                                color: '#9f1d1d',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                        {group.is_system_group && (
                          <span style={{ fontSize: 12, color: '#aaa' }}>Auto-managed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Create Distribution Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#75664b', fontWeight: 700, marginBottom: 6 }}>
                  Group Name *
                </label>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #e2d7c3',
                    borderRadius: 10,
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#75664b', fontWeight: 700, marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Enter group description"
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 10,
                    border: '1px solid #e2d7c3',
                    borderRadius: 10,
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
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
                onClick={handleCreateGroup}
                disabled={saving}
                style={{
                  background: '#174a2a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? 'Creating...' : <><Save size={16} /> Create Group</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Group Assignment Modal */}
      {showUserGroupModal && selectedUserForGroups && (
        <div className="modal-overlay" onClick={() => setShowUserGroupModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Manage Groups - {selectedUserForGroups.full_name || selectedUserForGroups.phone}</h2>
              <button
                onClick={() => setShowUserGroupModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groups.map(group => {
                  const isAssigned = (selectedGroups[selectedUserForGroups.id] || []).includes(group.id);
                  return (
                    <div
                      key={group.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        border: '1px solid #e2d7c3',
                        borderRadius: 10,
                        background: isAssigned ? '#f2faf5' : 'white',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14 }}>{group.name}</strong>
                        {group.description && (
                          <div style={{ fontSize: 12, color: '#75664b' }}>{group.description}</div>
                        )}
                        {group.is_system_group && (
                          <div style={{ fontSize: 11, color: '#c8963e', fontWeight: 700 }}>
                            System Group
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleUserGroup(selectedUserForGroups.id, group.id, !isAssigned)}
                        disabled={group.is_system_group}
                        style={{
                          background: isAssigned ? '#174a2a' : 'white',
                          color: isAssigned ? 'white' : '#75664b',
                          border: isAssigned ? '1px solid #174a2a' : '1px solid #e2d7c3',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: group.is_system_group ? 'not-allowed' : 'pointer',
                          opacity: group.is_system_group ? 0.5 : 1,
                        }}
                      >
                        {isAssigned ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowUserGroupModal(false)}
                style={{
                  background: '#174a2a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Users to Group Modal */}
      {showGroupUserModal && (
        <div className="modal-overlay" onClick={() => setShowGroupUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Add Users to Group</h2>
              <button
                onClick={() => {
                  setShowGroupUserModal(false);
                  setSelectedGroupForUsers(null);
                  setSelectedUsersForGroup([]);
                }}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {!selectedGroupForUsers ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#75664b', fontWeight: 700, marginBottom: 12 }}>
                    Select Group
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groups.filter(g => !g.is_system_group).map(group => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupForUsers(group)}
                        style={{
                          background: 'white',
                          color: '#174a2a',
                          border: '1px solid #e2d7c3',
                          borderRadius: 10,
                          padding: 12,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {group.name}
                        {group.description && (
                          <span style={{ fontSize: 12, color: '#75664b', fontWeight: 400, marginLeft: 8 }}>
                            - {group.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#75664b', fontWeight: 700, marginBottom: 4 }}>
                      Selected Group
                    </label>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#174a2a' }}>
                      {selectedGroupForUsers.name}
                    </div>
                    <button
                      onClick={() => setSelectedGroupForUsers(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#75664b',
                        fontSize: 12,
                        cursor: 'pointer',
                        marginTop: 4,
                      }}
                    >
                      Change group
                    </button>
                  </div>

                  <label style={{ display: 'block', fontSize: 12, color: '#75664b', fontWeight: 700, marginBottom: 12 }}>
                    Select Users to Add/Remove
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {users.map(user => {
                      const isAssigned = (selectedGroups[user.id] || []).includes(selectedGroupForUsers.id);
                      const isSelected = selectedUsersForGroup.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 12,
                            border: '1px solid #e2d7c3',
                            borderRadius: 10,
                            background: (isAssigned && !isSelected) || isSelected ? '#f2faf5' : 'white',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: 14 }}>{user.full_name || user.phone}</strong>
                            <div style={{ fontSize: 12, color: '#75664b' }}>{user.phone}</div>
                            {isAssigned && !isSelected && (
                              <div style={{ fontSize: 11, color: '#d32f2f', fontWeight: 700 }}>
                                Currently in group (will be removed)
                              </div>
                            )}
                            {isAssigned && isSelected && (
                              <div style={{ fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>
                                Currently in group (will remain)
                              </div>
                            )}
                            {!isAssigned && isSelected && (
                              <div style={{ fontSize: 11, color: '#174a2a', fontWeight: 700 }}>
                                Will be added to group
                              </div>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                if (!selectedUsersForGroup.includes(user.id)) {
                                  setSelectedUsersForGroup([...selectedUsersForGroup, user.id]);
                                }
                              } else {
                                setSelectedUsersForGroup(selectedUsersForGroup.filter(id => id !== user.id));
                              }
                            }}
                            style={{ width: 18, height: 18 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowGroupUserModal(false);
                  setSelectedGroupForUsers(null);
                  setSelectedUsersForGroup([]);
                }}
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
              {selectedGroupForUsers && (
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const currentGroupMembers = users
                        .filter(u => (selectedGroups[u.id] || []).includes(selectedGroupForUsers.id))
                        .map(u => u.id);
                      
                      // Add new users
                      for (const userId of selectedUsersForGroup) {
                        if (!currentGroupMembers.includes(userId)) {
                          await api.post(`/v1/distribution-groups/${selectedGroupForUsers.id}/members`, {
                            user_id: userId,
                            auto_added: false,
                          });
                        }
                      }
                      
                      // Remove users that were unchecked
                      for (const userId of currentGroupMembers) {
                        if (!selectedUsersForGroup.includes(userId)) {
                          await api.delete(`/v1/distribution-groups/${selectedGroupForUsers.id}/members/${userId}`);
                        }
                      }
                      
                      await loadUserAssignments();
                      setShowGroupUserModal(false);
                      setSelectedGroupForUsers(null);
                      setSelectedUsersForGroup([]);
                    } catch (err: any) {
                      console.error('Failed to update users in group:', err);
                      alert(err?.response?.data?.detail || 'Failed to update users in group');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  style={{
                    background: '#174a2a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
