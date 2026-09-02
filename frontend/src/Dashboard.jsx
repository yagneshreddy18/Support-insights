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
      <header className="dashboard-header">
        <div className="brand-title-group">
          <h1>
            Support Insights AI
            <span className="brand-badge">Enterprise v2.0</span>
          </h1>
          <p>Real-time predictive support analytics, automated risk triage &amp; team management</p>
        </div>

        <div className="user-profile-bar">
          <div className="user-identity-chip">
            <div className="user-avatar-circle">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="user-name-text">{user?.name || 'User'}</span>
            <span className={`role-pill ${user?.role || 'agent'}`}>
              {user?.role || 'agent'}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            title="Refresh Live Data"
            className="icon-btn-ghost"
          >
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="logout-btn"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      {/* Modern Tab Navigation Bar */}
      <nav className="dashboard-nav-tabs">
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
            className={`dashboard-tab-btn admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <FiLock /> Security &amp; Users
          </button>
        )}
      </nav>

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
