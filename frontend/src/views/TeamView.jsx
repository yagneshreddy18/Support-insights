import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiUsers, FiAward, FiCheckCircle, FiClock, FiAlertTriangle, FiInbox
} from 'react-icons/fi';

const TeamView = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentsAnalytics = async () => {
      try {
        const res = await axios.get('/api/analytics/agents');
        setAgents(res.data);
      } catch (err) {
        console.error('Failed to load agent analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgentsAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="tab-view-container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--accent-primary)' }}>
        Loading Team Performance &amp; Leaderboard...
      </div>
    );
  }

  const medalColors = ['#fbbf24', '#94a3b8', '#b45309'];

  return (
    <div className="tab-view-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Support Team &amp; Workload Leaderboard</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Track individual agent performance, resolution velocity, and active queue distribution</p>
      </div>

      {agents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No agent activity records found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {agents.map((agent, index) => {
            const total = agent.total_assigned || 0;
            const resolved = agent.resolved_tickets || 0;
            const active = agent.active_tickets || 0;
            const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

            return (
              <div
                key={agent.agent_id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderLeft: index === 0 ? '4px solid #fbbf24' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Agent Profile & Rank */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: index < 3 ? `${medalColors[index]}22` : 'rgba(255,255,255,0.05)',
                      color: index < 3 ? medalColors[index] : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1.1rem',
                      border: `1px solid ${index < 3 ? medalColors[index] : 'var(--border-color)'}`
                    }}>
                      {index === 0 ? <FiAward /> : `#${index + 1}`}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{agent.agent_name}</strong>
                        <span style={{
                          background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                          padding: '0.15rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', textTransform: 'capitalize', fontWeight: 600
                        }}>
                          {agent.agent_role || 'Agent'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{agent.agent_email}</span>
                    </div>
                  </div>

                  {/* Right: Key Performance Stats */}
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resolution Rate</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {rate}%
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Resolution Speed</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {agent.avg_resolution_hours ? `${agent.avg_resolution_hours}h` : '—'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Handled</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#60a5fa' }}>
                        {total}
                      </div>
                    </div>

                    {agent.high_risk_tickets > 0 && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        padding: '0.4rem 0.8rem', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600
                      }}>
                        <FiAlertTriangle /> {agent.high_risk_tickets} high risk
                      </div>
                    )}
                  </div>
                </div>

                {/* Workload Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>
                      <strong style={{ color: '#f59e0b' }}>{active}</strong> Active in queue &bull; <strong style={{ color: '#10b981' }}>{resolved}</strong> Successfully resolved
                    </span>
                    <span>Load: {total > 0 ? Math.round((active / total) * 100) : 0}% Active</span>
                  </div>
                  <div style={{
                    width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px', overflow: 'hidden', display: 'flex'
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
  );
};

export default TeamView;
