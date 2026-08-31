import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CreateTicketForm from './CreateTicketForm';
import { 
  FiAlertCircle, 
  FiClock, 
  FiCheckCircle, 
  FiInbox, 
  FiTrendingUp, 
  FiActivity 
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [priorityStats, setPriorityStats] = useState([]);
  const [riskTickets, setRiskTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [
        summaryRes, 
        ticketsRes,
        categoryRes,
        statusRes,
        priorityRes,
        riskRes
      ] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/tickets'),
        axios.get('/api/dashboard/category-stats'),
        axios.get('/api/dashboard/status-stats'),
        axios.get('/api/dashboard/priority-stats'),
        axios.get('/api/dashboard/risk-tickets')
      ]);
      
      setSummary(summaryRes.data);
      setTickets(ticketsRes.data);
      setCategoryStats(categoryRes.data);
      setStatusStats(statusRes.data);
      setPriorityStats(priorityRes.data);
      setRiskTickets(riskRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="loading">Loading AI Insights...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Support Insights AI</h1>
        <p>Real-time analytics and intelligent predictions</p>
      </div>

      <div className="summary-cards">
        <div className="card">
          <div className="card-title"><FiInbox /> Total Tickets</div>
          <div className="card-value">{summary?.total_tickets || 0}</div>
        </div>
        <div className="card">
          <div className="card-title"><FiClock /> Open & In Progress</div>
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
        
        {/* AI & Risk Metrics */}
        <div className="card risk">
          <div className="card-title"><FiActivity /> Avg SLA Breach Risk</div>
          <div className="card-value">
            {summary?.average_sla_breach_probability ? (summary.average_sla_breach_probability * 100).toFixed(1) + '%' : 'N/A'}
          </div>
        </div>
        <div className="card polarity">
          <div className="card-title"><FiTrendingUp /> Negative Polarity</div>
          <div className="card-value">{summary?.negative_polarity_tickets || 0}</div>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title">Tickets by Category</div>
          <div style={{ marginTop: '1rem' }}>
            {categoryStats.map(stat => (
              <div key={stat.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <span>{stat.category}</span>
                <strong>{stat.ticket_count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Tickets by Status</div>
          <div style={{ marginTop: '1rem' }}>
            {statusStats.map(stat => (
              <div key={stat.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <span>{stat.status}</span>
                <strong>{stat.ticket_count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Tickets by Priority</div>
          <div style={{ marginTop: '1rem' }}>
            {priorityStats.map(stat => (
              <div key={stat.priority} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <span>{stat.priority}</span>
                <strong>{stat.ticket_count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateTicketForm onTicketCreated={fetchDashboardData} />

      <div className="tickets-section" style={{ marginBottom: '2rem', border: '1px solid var(--danger)' }}>
        <div className="tickets-header" style={{ borderBottomColor: 'var(--danger)' }}>
          <h2 style={{ color: 'var(--danger)' }}>High-Risk Tickets (SLA/Escalation)</h2>
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
                <tr key={ticket.ticket_id}>
                  <td>#{ticket.ticket_id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.customer_name}</td>
                  <td>
                    <span className={`badge priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                    {(ticket.sla_breach_probability * 100).toFixed(0)}%
                  </td>
                  <td style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                    {(ticket.escalation_probability * 100).toFixed(0)}%
                  </td>
                  <td>{ticket.recommended_action}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No high-risk tickets detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tickets-section">
        <div className="tickets-header">
          <h2>All Tickets Overview</h2>
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
              {tickets.map(ticket => (
                <tr key={ticket.ticket_id}>
                  <td>#{ticket.ticket_id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.customer_name}</td>
                  <td>{ticket.category_name}</td>
                  <td>
                    <span className={`badge priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={ticket.status} 
                      onChange={(e) => handleStatusChange(ticket.ticket_id, e.target.value)}
                      className={`badge status-${ticket.status.replace(/\s+/g, '')}`}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'inherit', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="Open" style={{ color: 'black' }}>Open</option>
                      <option value="In Progress" style={{ color: 'black' }}>In Progress</option>
                      <option value="Resolved" style={{ color: 'black' }}>Resolved</option>
                    </select>
                  </td>
                  <td>
                    {ticket.polarity ? (
                      <span className={`badge polarity-${ticket.polarity}`}>
                        {ticket.polarity}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {ticket.sla_breach_probability 
                      ? (ticket.sla_breach_probability * 100).toFixed(0) + '%' 
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
