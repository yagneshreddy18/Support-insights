import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import CreateTicketForm from './CreateTicketForm';
import TicketDetailModal from './TicketDetailModal';
import {
  CategoryBarChart,
  PriorityPieChart,
  StatusDonutChart,
  TrendsLineChart,
} from './DashboardCharts';
import {
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiInbox,
  FiTrendingUp,
  FiActivity,
  FiSearch,
  FiFilter,
  FiRefreshCw,
} from 'react-icons/fi';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  // Filtering & search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

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

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(`/api/tickets/${ticketId}/status`, { status: newStatus });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !search ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        String(t.ticket_id).includes(search);
      const matchStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchPriority = filterPriority === 'All' || t.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, filterStatus, filterPriority]);

  if (loading) return (
    <div className="loading">
      <div className="loading-spinner" />
      Loading AI Insights...
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Support Insights AI</h1>
          <p>Real-time analytics and intelligent predictions</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</strong>
          </span>
          <button
            onClick={() => fetchDashboardData(true)}
            title="Refresh"
            style={{
              padding: '0.5rem', background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)',
              color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-title"><FiInbox /> Total Tickets</div>
          <div className="card-value">{summary?.total_tickets || 0}</div>
        </div>
        <div className="card">
          <div className="card-title"><FiClock /> Open &amp; In Progress</div>
          <div className="card-value">
            {(summary?.open_tickets || 0) + (summary?.in_progress_tickets || 0)}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><FiCheckCircle /> Resolved</div>
          <div className="card-value">{summary?.resolved_tickets || 0}</div>
        </div>
        <div className="card">
          <div className="card-title"><FiAlertCircle /> Critical Priority</div>
          <div className="card-value">{summary?.critical_tickets || 0}</div>
        </div>
        <div className="card risk">
          <div className="card-title"><FiActivity /> Avg SLA Breach Risk</div>
          <div className="card-value">
            {summary?.average_sla_breach_probability
              ? (summary.average_sla_breach_probability * 100).toFixed(1) + '%'
              : 'N/A'}
          </div>
        </div>
        <div className="card polarity">
          <div className="card-title"><FiTrendingUp /> Negative Polarity</div>
          <div className="card-value">{summary?.negative_polarity_tickets || 0}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Category</div>
          <CategoryBarChart data={categoryStats} />
        </div>
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Priority</div>
          <PriorityPieChart data={priorityStats} />
        </div>
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Status</div>
          <StatusDonutChart data={statusStats} />
        </div>
        <div className="card chart-card chart-wide">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Ticket Volume (Last 30 Days)</div>
          {trends.length > 0
            ? <TrendsLineChart data={trends} />
            : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '4rem' }}>No trend data available yet</div>
          }
        </div>
      </div>

      {/* Create Ticket */}
      <CreateTicketForm onTicketCreated={() => fetchDashboardData()} />

      {/* High-Risk Tickets */}
      <div className="tickets-section" style={{ marginBottom: '2rem', border: '1px solid var(--danger)' }}>
        <div className="tickets-header" style={{ borderBottomColor: 'var(--danger)' }}>
          <h2 style={{ color: 'var(--danger)' }}>⚠ High-Risk Tickets (SLA / Escalation)</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Priority</th>
                <th>SLA Risk</th>
                <th>Escalation Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {riskTickets.length > 0 ? riskTickets.map(ticket => (
                <tr
                  key={ticket.ticket_id}
                  className="clickable-row"
                  onClick={() => setSelectedTicketId(ticket.ticket_id)}
                >
                  <td>#{ticket.ticket_id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.customer_name}</td>
                  <td>
                    <span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span>
                  </td>
                  <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                    {(ticket.sla_breach_probability * 100).toFixed(0)}%
                  </td>
                  <td style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                    {(ticket.escalation_probability * 100).toFixed(0)}%
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {ticket.recommended_action}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    ✅ No high-risk tickets detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Tickets with Search + Filter */}
      <div className="tickets-section">
        <div className="tickets-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>All Tickets <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 400 }}>({filteredTickets.length})</span></h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem',
                  borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem',
                  outline: 'none', width: '200px',
                }}
              />
            </div>
            {/* Status filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiFilter style={{ position: 'absolute', left: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem', pointerEvents: 'none' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem',
                  borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              <option value="All">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>AI Polarity</th>
                <th>SLA Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                <tr
                  key={ticket.ticket_id}
                  className="clickable-row"
                  onClick={(e) => {
                    // Don't open modal when clicking the status dropdown
                    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
                    setSelectedTicketId(ticket.ticket_id);
                  }}
                >
                  <td>#{ticket.ticket_id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.customer_name}</td>
                  <td>{ticket.category_name}</td>
                  <td>
                    <span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.ticket_id, e.target.value)}
                      className={`badge status-${ticket.status.replace(/\s+/g, '')}`}
                      style={{
                        background: 'transparent', border: '1px solid var(--border-color)',
                        color: 'inherit', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="Open" style={{ color: 'black' }}>Open</option>
                      <option value="In Progress" style={{ color: 'black' }}>In Progress</option>
                      <option value="Resolved" style={{ color: 'black' }}>Resolved</option>
                    </select>
                  </td>
                  <td>
                    {ticket.polarity ? (
                      <span className={`badge polarity-${ticket.polarity}`}>{ticket.polarity}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {ticket.sla_breach_probability
                      ? (ticket.sla_breach_probability * 100).toFixed(0) + '%'
                      : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No tickets match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
