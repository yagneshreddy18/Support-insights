import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiX, FiUsers, FiAward, FiCheckCircle, FiClock, FiAlertTriangle, FiActivity } from 'react-icons/fi';

const AgentLeaderboardModal = ({ onClose }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentsAnalytics = async () => {
      try {
        const res = await axios.get('/api/analytics/agents');
        setAgents(res.data);
      } catch (err) {
        console.error('Failed to load agent leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgentsAnalytics();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        width: '100%', maxWidth: '840px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem',
        position: 'relative',
        animation: 'slideUp 0.25s ease',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
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

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
            padding: '0.6rem', borderRadius: '10px', display: 'flex', fontSize: '1.4rem'
          }}>
            <FiUsers />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Agent Workload &amp; Performance Leaderboard
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time team distribution, ticket throughput, and resolution speed
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-primary)' }}>
            Loading agent performance analytics...
          </div>
        ) : agents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No agent performance data found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {agents.map((agent, index) => {
              const total = agent.total_assigned || 0;
              const resolved = agent.resolved_tickets || 0;
              const active = agent.active_tickets || 0;
              const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
              const medalColors = ['#fbbf24', '#94a3b8', '#b45309'];

              return (
                <div
                  key={agent.agent_id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: index < 3 ? `${medalColors[index]}22` : 'rgba(255,255,255,0.05)',
                        color: index < 3 ? medalColors[index] : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.9rem', border: `1px solid ${index < 3 ? medalColors[index] : 'var(--border-color)'}`
                      }}>
                        {index === 0 ? <FiAward /> : `#${index + 1}`}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{agent.agent_name}</strong>
                          <span style={{
                            background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                            padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', textTransform: 'capitalize'
                          }}>
                            {agent.agent_role || 'Agent'}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{agent.agent_email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resolution Rate</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {rate}%
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Speed</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {agent.avg_resolution_hours ? `${agent.avg_resolution_hours}h` : '—'}
                        </div>
                      </div>

                      {agent.high_risk_tickets > 0 && (
                        <div style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#f87171', fontSize: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          <FiAlertTriangle /> {agent.high_risk_tickets} at risk
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Workload Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                      <span>
                        <strong style={{ color: '#f59e0b' }}>{active}</strong> Active &bull; <strong style={{ color: '#10b981' }}>{resolved}</strong> Resolved
                      </span>
                      <span>Total: {total}</span>
                    </div>
                    <div style={{
                      width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px', overflow: 'hidden', display: 'flex'
                    }}>
                      <div
                        style={{
                          width: `${total > 0 ? (resolved / total) * 100 : 0}%`,
                          background: '#10b981',
                          transition: 'width 0.5s ease'
                        }}
                        title={`Resolved: ${resolved}`}
                      />
                      <div
                        style={{
                          width: `${total > 0 ? (active / total) * 100 : 0}%`,
                          background: '#f59e0b',
                          transition: 'width 0.5s ease'
                        }}
                        title={`Active: ${active}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentLeaderboardModal;
