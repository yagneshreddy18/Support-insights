import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiX, FiUser, FiTag, FiAlertTriangle, FiTrendingUp, FiClock, FiMessageSquare } from 'react-icons/fi';

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

const TicketDetailModal = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await axios.get(`/api/tickets/${ticketId}`);
        setTicket(res.data);
      } catch (err) {
        console.error('Failed to fetch ticket detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();

    // Close on ESC
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ticketId, onClose]);

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
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%', maxWidth: '720px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem',
        position: 'relative',
        animation: 'slideUp 0.25s ease',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* Close Button */}
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-primary)' }}>
            Loading ticket details...
          </div>
        ) : ticket ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', paddingRight: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{
                  background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                }}>#{ticket.ticket_id}</span>
                <span style={{
                  background: `${priorityColors[ticket.priority]}22`,
                  color: priorityColors[ticket.priority],
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                }}>{ticket.priority}</span>
                <span style={{
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem',
                }}>{ticket.status}</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {ticket.subject}
              </h2>
            </div>

            {/* Meta Row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem', marginBottom: '1.5rem',
            }}>
              {[
                { icon: <FiUser />, label: 'Customer', value: ticket.customer_name },
                { icon: <FiTag />, label: 'Category', value: ticket.category_name },
                { icon: <FiMessageSquare />, label: 'Channel', value: ticket.channel },
                { icon: <FiClock />, label: 'Created', value: formatDate(ticket.created_at) },
                { icon: <FiClock />, label: 'First Response', value: formatDate(ticket.first_response_at) },
                { icon: <FiClock />, label: 'Resolved', value: formatDate(ticket.resolved_at) },
              ].map((item) => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                  padding: '0.75rem 1rem', border: '1px solid var(--border-color)',
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {item.icon} {item.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
              padding: '1rem 1.25rem', border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Description</div>
              <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                {ticket.description}
              </p>
            </div>

            {/* AI Analysis */}
            {(ticket.sla_breach_probability !== null || ticket.polarity) && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '12px', padding: '1.5rem',
              }}>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <FiTrendingUp /> AI Predictions
                </div>

                {/* Risk Gauges */}
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
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

                {/* Polarity badge */}
                {ticket.polarity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sentiment:</span>
                    <span style={{
                      background: `${polarityColors[ticket.polarity]}22`,
                      color: polarityColors[ticket.polarity],
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700,
                      textTransform: 'capitalize',
                    }}>{ticket.polarity}</span>
                  </div>
                )}

                {/* Recommended Action */}
                {ticket.recommended_action && (
                  <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '8px', padding: '0.75rem 1rem',
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  }}>
                    <FiAlertTriangle style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        Recommended Action
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {ticket.recommended_action}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>
            Failed to load ticket.
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default TicketDetailModal;
