import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TicketDetailModal from './TicketDetailModal';
import OverviewView from './views/OverviewView';
import TicketsView from './views/TicketsView';
import SlaView from './views/SlaView';
import TeamView from './views/TeamView';
import AdminUsersView from './views/AdminUsersView';
import {
  FiTrendingUp,
  FiInbox,
  FiShield,
  FiUsers,
  FiRefreshCw,
  FiLogOut,
  FiLock
} from 'react-icons/fi';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation tab state: 'overview' | 'tickets' | 'sla' | 'team'
  const [activeTab, setActiveTab] = useState('overview');

  // Core data states
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [priorityStats, setPriorityStats] = useState([]);
  const [riskTickets, setRiskTickets] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [
        summaryRes,
        ticketsRes,
        categoryRes,
        statusRes,
        priorityRes,
        riskRes,
        trendsRes,
      ] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/tickets'),
        axios.get('/api/dashboard/category-stats'),
        axios.get('/api/dashboard/status-stats'),
        axios.get('/api/dashboard/priority-stats'),
        axios.get('/api/dashboard/risk-tickets'),
        axios.get('/api/dashboard/trends'),
      ]);

      setSummary(summaryRes.data);
      setTickets(ticketsRes.data);
      setCategoryStats(categoryRes.data);
      setStatusStats(statusRes.data);
      setPriorityStats(priorityRes.data);
      setRiskTickets(riskRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="loading">
      <div className="loading-spinner" />
      Loading AI Insights Workspace...
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Support Insights AI</h1>
          <p>Next-generation support intelligence, automated triage &amp; analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</strong>
            </span>
            <span style={{
              padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: user?.role === 'admin' ? 'rgba(239,68,68,0.15)' : user?.role === 'lead' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
              color: user?.role === 'admin' ? '#f87171' : user?.role === 'lead' ? '#fbbf24' : '#60a5fa',
              border: `1px solid ${user?.role === 'admin' ? 'rgba(239,68,68,0.3)' : user?.role === 'lead' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`
            }}>
              {user?.role || 'agent'}
            </span>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            title="Refresh Data"
            style={{
              padding: '0.55rem', background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1rem', background: 'rgba(239,68,68,0.1)',
              color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Modern Tab Navigation Bar */}
      <div className="dashboard-nav-tabs">
        <button
          className={`dashboard-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiTrendingUp /> Overview &amp; Analytics
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <FiInbox /> Tickets Center {tickets.length > 0 && `(${tickets.length})`}
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
          onClick={() => setActiveTab('sla')}
        >
          <FiShield /> SLA Policy &amp; CSAT
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <FiUsers /> Team Leaderboard
        </button>

        {/* Administrator Full Control Tab (Admin Role Only) */}
        {user?.role === 'admin' && (
          <button
            className={`dashboard-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            style={{
              borderLeft: '1px solid rgba(239,68,68,0.3)',
              color: activeTab === 'admin' ? 'white' : '#f87171'
            }}
          >
            <FiLock /> Security &amp; Users
          </button>
        )}
      </div>

      {/* Render Active View */}
      {activeTab === 'overview' && (
        <OverviewView
          summary={summary}
          categoryStats={categoryStats}
          priorityStats={priorityStats}
          statusStats={statusStats}
          trends={trends}
        />
      )}

      {activeTab === 'tickets' && (
        <TicketsView
          tickets={tickets}
          riskTickets={riskTickets}
          onTicketSelect={(id) => setSelectedTicketId(id)}
          onRefresh={() => fetchDashboardData()}
        />
      )}

      {activeTab === 'sla' && (
        <SlaView />
      )}

      {activeTab === 'team' && (
        <TeamView />
      )}

      {activeTab === 'admin' && user?.role === 'admin' && (
        <AdminUsersView />
      )}

      {/* Ticket Detail Modal (when any ticket is clicked across any view) */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={() => fetchDashboardData()}
        />
      )}
    </div>
  );
};

export default Dashboard;
