import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FiX, FiUser, FiTag, FiAlertTriangle, FiTrendingUp, FiClock, 
  FiMessageSquare, FiList, FiStar, FiSend, FiUserCheck, FiCheckCircle, FiTrash2
} from 'react-icons/fi';
import { useAuth } from './context/AuthContext';

const RiskGauge = ({ value, label, color }) => {
  const pct = Math.round((value || 0) * 100);
  const dashArray = 2 * Math.PI * 36;
  const dashOffset = dashArray * (1 - (value || 0));

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle
          cx="45" cy="45" r="36" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="45" y="50" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{pct}%</text>
      </svg>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
};

const TicketDetailModal = ({ ticketId, onClose, onUpdate }) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const canReassign = currentUser?.role === 'admin' || currentUser?.role === 'lead';

  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, messages, events, feedback
  const [loading, setLoading] = useState(true);

  // New message form state
  const [newMessage, setNewMessage] = useState('');
  const [senderType, setSenderType] = useState('agent');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Updating assignment / status
  const [updatingAction, setUpdatingAction] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(false);

  const handleDeleteTicket = async () => {
    if (!window.confirm(`SECURITY WARNING: Are you sure you want to permanently delete ticket #${ticketId} and all associated conversation & audit history? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingTicket(true);
      await axios.delete(`/api/tickets/${ticketId}`);
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      alert(err.response?.data?.error || 'Failed to delete ticket');
      setDeletingTicket(false);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      const [ticketRes, agentsRes, messagesRes, eventsRes, feedbackRes] = await Promise.all([
        axios.get(`/api/tickets/${ticketId}`),
        axios.get('/api/agents'),
        axios.get(`/api/tickets/${ticketId}/messages`),
        axios.get(`/api/tickets/${ticketId}/events`),
        axios.get(`/api/tickets/${ticketId}/feedback`)
      ]);
      setTicket(ticketRes.data);
      setAgents(agentsRes.data);
      setMessages(messagesRes.data);
      setEvents(eventsRes.data);
      setFeedback(feedbackRes.data);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ticketId]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingAction(true);
      await axios.put(`/api/tickets/${ticketId}/status`, { status: newStatus });
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating status');
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      setUpdatingAction(true);
      await axios.put(`/api/tickets/${ticketId}/assign`, { agent_id: agentId });
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to assign agent:', err);
      alert('Error assigning agent');
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      await axios.post(`/api/tickets/${ticketId}/messages`, {
        message: newMessage,
        sender_type: senderType
      });
      setNewMessage('');
      const res = await axios.get(`/api/tickets/${ticketId}/messages`);
      setMessages(res.data);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to post message:', err);
      alert('Error posting message');
    } finally {
      setSendingMessage(false);
    }
  };

  const priorityColors = {
    Critical: '#ef4444',
    High: '#f59e0b',
    Medium: '#3b82f6',
    Low: '#10b981',
  };

  const polarityColors = {
    negative: '#ef4444',
    neutral: '#94a3b8',
    positive: '#10b981',
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%', maxWidth: '820px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        position: 'relative',
        animation: 'slideUp 0.25s ease',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.25rem', right: '1.25rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', borderRadius: '8px',
              width: '36px', height: '36px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }}
          >
            <FiX />
          </button>

          {loading ? (
            <div style={{ padding: '1rem', color: 'var(--accent-primary)' }}>Loading ticket details...</div>
          ) : ticket ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{
                  background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                }}>#{ticket.ticket_id}</span>
                <span style={{
                  background: `${priorityColors[ticket.priority]}22`,
                  color: priorityColors[ticket.priority],
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                }}>{ticket.priority}</span>
                <span className={`badge status-${ticket.status.replace(/\s+/g, '')}`}>
                  {ticket.status}
                </span>
                {ticket.channel && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    via {ticket.channel}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {ticket.subject}
              </h2>

              {/* Action Bar (Quick Status & Assign) */}
              <div style={{
                display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <select
                    disabled={updatingAction}
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)', color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '6px',
                      padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><FiUserCheck style={{ verticalAlign: 'middle' }} /> Assignee:</span>
                  <select
                    disabled={updatingAction || !canReassign}
                    value={agents.find(a => a.name === ticket.agent_name)?.id || ''}
                    onChange={(e) => handleAssignAgent(e.target.value)}
                    title={!canReassign ? "Only Team Leads and Admins can reassign tickets" : "Assign to team member"}
                    style={{
                      background: 'var(--bg-primary)', color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '6px',
                      padding: '0.3rem 0.6rem', fontSize: '0.8rem',
                      cursor: canReassign ? 'pointer' : 'not-allowed',
                      opacity: canReassign ? 1 : 0.6
                    }}
                  >
                    <option value="">{ticket.agent_name ? ticket.agent_name : 'Unassigned'}</option>
                    {agents.map(ag => (
                      <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                    ))}
                  </select>
                </div>

                {/* Permanent Delete Action (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={handleDeleteTicket}
                    disabled={deletingTicket}
                    style={{
                      marginLeft: 'auto',
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.35rem 0.75rem', borderRadius: '6px',
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.3)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}
                    title="Permanently delete this ticket (Admin permission)"
                  >
                    <FiTrash2 /> {deletingTicket ? 'Deleting...' : 'Delete Ticket'}
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            {[
              { id: 'overview', label: 'Overview & AI', icon: <FiTrendingUp /> },
              { id: 'messages', label: `Messages (${messages.length})`, icon: <FiMessageSquare /> },
              { id: 'events', label: `Activity Log (${events.length})`, icon: <FiList /> },
              { id: 'feedback', label: `Feedback (${feedback.length})`, icon: <FiStar /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.9rem', borderRadius: '8px 8px 0 0',
                  background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
          {loading ? null : !ticket ? (
            <div style={{ color: 'var(--danger)', textAlign: 'center' }}>Failed to load ticket details.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  {/* Meta Details */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.75rem', marginBottom: '1.25rem',
                  }}>
                    {[
                      { icon: <FiUser />, label: 'Customer', value: `${ticket.customer_name} (${ticket.customer_email || 'No email'})` },
                      { icon: <FiTag />, label: 'Category', value: ticket.category_name },
                      { icon: <FiClock />, label: 'Created At', value: formatDate(ticket.created_at) },
                      { icon: <FiCheckCircle />, label: 'Resolved At', value: formatDate(ticket.resolved_at) },
                    ].map((item) => (
                      <div key={item.label} style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                        padding: '0.75rem', border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {item.icon} {item.label}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                    padding: '1rem', border: '1px solid var(--border-color)',
                    marginBottom: '1.25rem',
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Original Description</div>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                      {ticket.description}
                    </p>
                  </div>

                  {/* AI Predictions Section */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: '12px', padding: '1.25rem',
                  }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '1rem',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                      <FiTrendingUp /> Real-Time AI Predictions &amp; Sentiment
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <RiskGauge
                        value={ticket.sla_breach_probability}
                        label="SLA Breach Risk"
                        color="#ef4444"
                      />
                      <RiskGauge
                        value={ticket.escalation_probability}
                        label="Escalation Risk"
                        color="#f59e0b"
                      />
                      {ticket.polarity_score !== null && (
                        <RiskGauge
                          value={Math.abs(ticket.polarity_score)}
                          label="Sentiment Intensity"
                          color={polarityColors[ticket.polarity] || '#94a3b8'}
                        />
                      )}
                    </div>

                    {ticket.polarity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Customer Sentiment:</span>
                        <span style={{
                          background: `${polarityColors[ticket.polarity]}22`,
                          color: polarityColors[ticket.polarity],
                          padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700,
                          textTransform: 'capitalize',
                        }}>{ticket.polarity}</span>
                      </div>
                    )}

                    {ticket.recommended_action && (
                      <div style={{
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '8px', padding: '0.75rem 1rem',
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                      }}>
                        <FiAlertTriangle style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                            Recommended AI Action
                          </div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {ticket.recommended_action}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MESSAGES & NOTES */}
              {activeTab === 'messages' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                  {/* Messages List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {messages.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        No messages or notes posted yet. Be the first to respond!
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isAgent = msg.sender_type === 'agent';
                        return (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: isAgent ? 'flex-end' : 'flex-start',
                              maxWidth: '80%',
                              background: isAgent ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isAgent ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                              borderRadius: '12px',
                              padding: '0.75rem 1rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                              <strong style={{ color: isAgent ? '#60a5fa' : '#34d399' }}>
                                {isAgent ? 'Support Agent' : 'Customer'}
                              </strong>
                              <span style={{ color: 'var(--text-secondary)' }}>{formatDate(msg.created_at)}</span>
                            </div>
                            <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Form */}
                  <form onSubmit={handleSendMessage} style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="radio"
                          name="senderType"
                          value="agent"
                          checked={senderType === 'agent'}
                          onChange={() => setSenderType('agent')}
                        />
                        Agent Response
                      </label>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="radio"
                          name="senderType"
                          value="customer"
                          checked={senderType === 'customer'}
                          onChange={() => setSenderType('customer')}
                        />
                        Customer Reply
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <textarea
                        rows="2"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a response or note..."
                        style={{
                          flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px',
                          border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                          color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !newMessage.trim()}
                        style={{
                          padding: '0 1.25rem', background: 'var(--accent-primary)',
                          color: 'white', border: 'none', borderRadius: '8px',
                          cursor: 'pointer', fontWeight: 600, display: 'flex',
                          alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem'
                        }}
                      >
                        <FiSend /> Send
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: ACTIVITY / EVENTS AUDIT LOG */}
              {activeTab === 'events' && (
                <div>
                  {events.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                      No activity logged yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {events.map((evt) => (
                        <div
                          key={evt.id}
                          style={{
                            display: 'flex', gap: '1rem', alignItems: 'flex-start',
                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                            borderRadius: '8px', padding: '0.75rem 1rem'
                          }}
                        >
                          <div style={{
                            background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)',
                            padding: '0.4rem', borderRadius: '50%', display: 'flex'
                          }}>
                            <FiList />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                {evt.event_type.replace(/_/g, ' ')}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {formatDate(evt.created_at)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {evt.note || `${evt.old_value} → ${evt.new_value}`}
                            </div>
                            {evt.user_name && (
                              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                                By: {evt.user_name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FEEDBACK */}
              {activeTab === 'feedback' && (
                <div>
                  {feedback.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                      No customer feedback received for this ticket yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {feedback.map((fb) => (
                        <div
                          key={fb.id}
                          style={{
                            background: 'rgba(245,158,11,0.05)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '10px', padding: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', color: '#f59e0b' }}>
                              {[...Array(5)].map((_, i) => (
                                <FiStar
                                  key={i}
                                  fill={i < fb.rating ? '#f59e0b' : 'none'}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {formatDate(fb.created_at)}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            "{fb.comment || 'No written comment provided.'}"
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Customer: <strong>{fb.customer_name || 'Anonymous'}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
