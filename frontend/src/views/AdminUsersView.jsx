import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FiShield, FiUserCheck, FiUsers, FiLock, FiAlertTriangle, FiCheckCircle, FiRefreshCw 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const AdminUsersView = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [notification, setNotification] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      setNotification('');
      const res = await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      setNotification(`Successfully updated role for ${res.data.name} to ${res.data.role.toUpperCase()}`);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const leadCount = users.filter(u => u.role === 'lead').length;
  const agentCount = users.filter(u => u.role === 'agent').length;

  return (
    <div className="tab-view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiShield style={{ color: '#ef4444' }} /> Admin Security &amp; Role-Based Access Control
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Full system control: Manage staff privileges, assign permissions, and audit user roles
          </p>
        </div>
        <button
          onClick={fetchUsers}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)', border: '1px solid var(--border-color)',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
          }}
        >
          <FiRefreshCw /> Refresh Users
        </button>
      </div>

      {notification && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#34d399', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
        }}>
          <FiCheckCircle /> {notification}
        </div>
      )}

      {/* Role Summary Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem', marginBottom: '2rem'
      }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="card-title"><FiShield style={{ color: '#ef4444' }} /> Administrators</div>
          <div className="card-value" style={{ color: '#ef4444' }}>{adminCount}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Full control, delete tickets, manage roles
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="card-title"><FiUserCheck style={{ color: '#f59e0b' }} /> Team Leads</div>
          <div className="card-value" style={{ color: '#f59e0b' }}>{leadCount}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Reassign tickets, oversee metrics &amp; SLA
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="card-title"><FiUsers style={{ color: '#3b82f6' }} /> Support Agents</div>
          <div className="card-value" style={{ color: '#3b82f6' }}>{agentCount}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Work assigned tickets, conversation replies
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="card" style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.02)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FiLock /> Role Permissions Matrix
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ background: 'rgba(239,68,68,0.06)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <strong style={{ color: '#ef4444' }}>Admin Privileges:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>Permanent ticket deletion (with child cascades)</li>
              <li>Promote / demote staff roles</li>
              <li>Reassign tickets &amp; modify SLA parameters</li>
              <li>Access full audit trails and CSAT logs</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.06)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
            <strong style={{ color: '#f59e0b' }}>Lead Privileges:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>Reassign tickets to any agent on the team</li>
              <li>View all queues, high-risk triage, and team workloads</li>
              <li>Change priority and ticket statuses</li>
              <li>Cannot delete tickets or alter user roles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(59,130,246,0.06)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <strong style={{ color: '#3b82f6' }}>Agent Privileges:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>View queues and assigned tickets</li>
              <li>Post customer replies and internal notes</li>
              <li>Update ticket statuses (Open &rarr; Resolved)</li>
              <li>Cannot reassign or delete tickets</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="tickets-section">
        <div className="tickets-header">
          <h3>Registered System Users ({users.length})</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Tickets Assigned</th>
                <th>Current Role</th>
                <th>Change Role Access</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-primary)' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : users.map(u => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>
                      <strong>{u.name}</strong> {isSelf && <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>(You)</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{u.tickets_assigned || 0}</span>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                        textTransform: 'uppercase',
                        background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : u.role === 'lead' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                        color: u.role === 'admin' ? '#f87171' : u.role === 'lead' ? '#fbbf24' : '#60a5fa',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <select
                        disabled={updatingId === u.id}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '0.4rem 0.75rem', borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)',
                          fontSize: '0.85rem', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        <option value="agent">Support Agent</option>
                        <option value="lead">Team Lead</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersView;
