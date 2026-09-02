import React, { useState, useMemo } from 'react';
import axios from 'axios';
import CreateTicketForm from '../CreateTicketForm';
import {
  FiSearch, FiFilter, FiDownload, FiPlus, FiChevronUp, FiAlertTriangle
} from 'react-icons/fi';

const TicketsView = ({
  tickets,
  riskTickets,
  onTicketSelect,
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(`/api/tickets/${ticketId}/status`, { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

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

  const exportToCSV = () => {
    if (!filteredTickets.length) {
      alert('No tickets to export');
      return;
    }

    const headers = ['Ticket ID', 'Subject', 'Customer', 'Category', 'Priority', 'Status', 'AI Polarity', 'SLA Breach Risk %'];
    const rows = filteredTickets.map(t => [
      t.ticket_id,
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      `"${(t.customer_name || '').replace(/"/g, '""')}"`,
      `"${(t.category_name || '').replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      t.polarity || 'N/A',
      t.sla_breach_probability ? Math.round(t.sla_breach_probability * 100) : 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `support_tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-view-container">
      {/* Top Action Row: Toggle Create Form & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tickets Operations Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage queues, assign engineers, and triage AI risks</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', background: showCreateForm ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)',
            color: 'white', border: showCreateForm ? '1px solid var(--border-color)' : 'none',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
          }}
        >
          {showCreateForm ? <><FiChevronUp /> Hide Ticket Form</> : <><FiPlus /> Create New Ticket</>}
        </button>
      </div>

      {/* Collapsible Ticket Creation */}
      {showCreateForm && (
        <div style={{ marginBottom: '2rem' }}>
          <CreateTicketForm onTicketCreated={() => {
            onRefresh();
            setShowCreateForm(false);
          }} />
        </div>
      )}

      {/* High-Risk Tickets Alert Box */}
      {riskTickets && riskTickets.length > 0 && (
        <div className="tickets-section" style={{ marginBottom: '2rem', border: '1px solid var(--danger)' }}>
          <div className="tickets-header" style={{ borderBottomColor: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiAlertTriangle /> High-Risk Tickets ({riskTickets.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>SLA breach or escalation probability &ge; 60%</span>
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
                  <th>AI Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {riskTickets.map(ticket => (
                  <tr
                    key={ticket.ticket_id}
                    className="clickable-row"
                    onClick={() => onTicketSelect(ticket.ticket_id)}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Tickets with Search & Filters */}
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

            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.85rem', borderRadius: '8px',
                border: '1px solid rgba(59,130,246,0.4)',
                background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}
              title="Export visible tickets to CSV"
            >
              <FiDownload /> Export CSV
            </button>
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
                    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
                    onTicketSelect(ticket.ticket_id);
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
    </div>
  );
};

export default TicketsView;
