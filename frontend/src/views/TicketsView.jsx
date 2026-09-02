import React, { useState, useMemo } from 'react';
import axios from 'axios';
import CreateTicketForm from '../CreateTicketForm';
import {
  FiSearch, FiFilter, FiDownload, FiPlus, FiChevronUp, FiAlertTriangle, FiZap
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
    if (!filteredTickets.length) { alert('No tickets to export'); return; }
    const headers = ['Ticket ID', 'Subject', 'Customer', 'Category', 'Priority', 'Status', 'AI Polarity', 'SLA Breach Risk %'];
    const rows = filteredTickets.map(t => [
      t.ticket_id, `"${t.subject}"`, t.customer_name, t.category_name,
      t.priority, t.status, t.polarity || '',
      t.sla_breach_probability ? (t.sla_breach_probability * 100).toFixed(0) + '%' : '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `support_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-view-container">

      {/* Page Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Tickets Operations Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {tickets.length} total tickets · {filteredTickets.length} visible after filters
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={showCreateForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showCreateForm ? <><FiChevronUp /> Hide Form</> : <><FiPlus /> New Ticket</>}
        </button>
      </div>

      {/* Collapsible Ticket Creation */}
      {showCreateForm && (
        <div style={{ marginBottom: '2rem' }}>
          <CreateTicketForm onTicketCreated={() => { onRefresh(); setShowCreateForm(false); }} />
        </div>
      )}

      {/* High-Risk AI Alert Table */}
      {riskTickets && riskTickets.length > 0 && (
        <div className="tickets-section" style={{ marginBottom: '2rem', borderColor: 'var(--rose-border)' }}>
          <div className="tickets-header" style={{ borderBottomColor: 'rgba(244, 63, 94, 0.2)' }}>
            <h3 style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiAlertTriangle /> AI Flagged High-Risk Tickets
              <span style={{
                background: 'var(--rose-bg)', border: '1px solid var(--rose-border)',
                color: '#fb7185', padding: '0.1rem 0.5rem', borderRadius: '9999px',
                fontSize: '0.75rem', fontWeight: 800
              }}>{riskTickets.length}</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>SLA breach or escalation probability ≥ 60%</span>
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
                  <th>AI Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {riskTickets.map(ticket => (
                  <tr key={ticket.ticket_id} className="clickable-row" onClick={() => onTicketSelect(ticket.ticket_id)}>
                    <td><span className="ticket-id-tag">#{ticket.ticket_id}</span></td>
                    <td style={{ fontWeight: 500, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{ticket.customer_name}</td>
                    <td><span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span></td>
                    <td>
                      <span style={{ color: '#fb7185', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {(ticket.sla_breach_probability * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#fbbf24', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {(ticket.escalation_probability * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <FiZap style={{ verticalAlign: 'middle', marginRight: '0.3rem', color: '#a5b4fc' }} />
                      {ticket.recommended_action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Tickets Table with Search & Filters */}
      <div className="tickets-section">
        <div className="tickets-header">
          <h3>
            All Tickets{' '}
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>({filteredTickets.length})</span>
          </h3>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search tickets, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', paddingRight: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', width: '220px' }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiFilter style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-dim)', pointerEvents: 'none', fontSize: '0.875rem' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <option value="All">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              className="btn-secondary"
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)' }}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
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
                  <td><span className="ticket-id-tag">#{ticket.ticket_id}</span></td>
                  <td style={{ fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.subject}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{ticket.customer_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>{ticket.category_name}</td>
                  <td>
                    <span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.ticket_id, e.target.value)}
                      className={`badge status-${ticket.status.replace(/\s+/g, '')}`}
                      style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.725rem' }}
                    >
                      <option value="Open" style={{ background: '#0f1624', color: '#f1f5f9' }}>Open</option>
                      <option value="In Progress" style={{ background: '#0f1624', color: '#f1f5f9' }}>In Progress</option>
                      <option value="Resolved" style={{ background: '#0f1624', color: '#f1f5f9' }}>Resolved</option>
                    </select>
                  </td>
                  <td>
                    {ticket.polarity
                      ? <span className={`badge polarity-${ticket.polarity}`}>{ticket.polarity}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {ticket.sla_breach_probability
                      ? <span style={{ color: ticket.sla_breach_probability > 0.6 ? '#fb7185' : ticket.sla_breach_probability > 0.3 ? '#fbbf24' : '#34d399' }}>
                          {(ticket.sla_breach_probability * 100).toFixed(0)}%
                        </span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem' }}>
                    No tickets match your current filters
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
