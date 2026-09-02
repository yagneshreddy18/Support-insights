import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiAward, FiAlertTriangle, FiTrendingUp, FiInbox, FiZap
} from 'react-icons/fi';

const medalColors = ['#fbbf24', '#94a3b8', '#c97c2e'];
const medalLabels = ['🥇', '🥈', '🥉'];

const TeamView = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/analytics/agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error('Failed to load agent analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tab-view-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading Team Performance Leaderboard...</span>
      </div>
    );
  }

  return (
    <div className="tab-view-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
          Support Team Leaderboard
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Track individual agent performance, resolution velocity, and active queue distribution
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No agent activity records found yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {agents.map((agent, index) => {
            const total = agent.total_assigned || 0;
            const resolved = agent.resolved_tickets || 0;
            const active = agent.active_tickets || 0;
            const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
            const isTopPerformer = index === 0;

            return (
              <div
                key={agent.agent_id}
                className="card"
                style={{
                  padding: '1.5rem 1.75rem',
                  borderLeft: isTopPerformer
                    ? '3px solid #fbbf24'
                    : index === 1
                    ? '3px solid #94a3b8'
                    : '3px solid var(--border-card)',
                  background: isTopPerformer
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.04), var(--bg-card))'
                    : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Agent identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: index < 3 ? `rgba(${medalColors[index] === '#fbbf24' ? '251,191,36' : medalColors[index] === '#94a3b8' ? '148,163,184' : '201,124,46'}, 0.12)` : 'rgba(255,255,255,0.05)',
                      color: index < 3 ? medalColors[index] : 'var(--text-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: index < 3 ? '1.2rem' : '1rem',
                      border: `1px solid ${index < 3 ? medalColors[index] + '44' : 'var(--border-subtle)'}`
                    }}>
                      {index < 3 ? medalLabels[index] : `#${index + 1}`}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{agent.agent_name}</strong>
                        <span style={{
                          background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)',
                          padding: '0.1rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', textTransform: 'capitalize', fontWeight: 600
                        }}>
                          {agent.agent_role || 'Agent'}
                        </span>
                        {isTopPerformer && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24' }}>
                            ⚡ Top Performer
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{agent.agent_email}</span>
                    </div>
                  </div>

                  {/* KPI stats */}
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Resolution Rate</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: rate >= 70 ? 'var(--emerald)' : rate >= 40 ? 'var(--amber)' : 'var(--rose)' }}>
                        {rate}%
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Avg Speed</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text-main)' }}>
                        {agent.avg_resolution_hours ? `${agent.avg_resolution_hours}h` : '—'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Total Handled</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#a5b4fc' }}>
                        {total}
                      </div>
                    </div>

                    {agent.high_risk_tickets > 0 && (
                      <div style={{
                        background: 'var(--rose-bg)', border: '1px solid var(--rose-border)',
                        padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)',
                        color: '#fb7185', fontSize: '0.8rem',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600
                      }}>
                        <FiAlertTriangle /> {agent.high_risk_tickets} high-risk
                      </div>
                    )}
                  </div>
                </div>

                {/* Workload Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>
                      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{active}</span> active in queue
                      &nbsp;·&nbsp;
                      <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>{resolved}</span> resolved
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>Queue load: {total > 0 ? Math.round((active / total) * 100) : 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.04)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div
                      style={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%`, background: 'var(--emerald)', transition: 'width 0.6s ease', borderRadius: '9999px 0 0 9999px' }}
                      title={`Resolved: ${resolved}`}
                    />
                    <div
                      style={{ width: `${total > 0 ? (active / total) * 100 : 0}%`, background: 'var(--amber)', transition: 'width 0.6s ease' }}
                      title={`Active: ${active}`}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--emerald)', display: 'inline-block' }} /> Resolved</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--amber)', display: 'inline-block' }} /> Active</span>
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
