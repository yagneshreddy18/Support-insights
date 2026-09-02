import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiX, FiShield, FiClock, FiStar, FiAward, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const SlaPerformanceModal = ({ onClose }) => {
  const [slaRules, setSlaRules] = useState([]);
  const [csat, setCsat] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlaData = async () => {
      try {
        const [rulesRes, csatRes, perfRes] = await Promise.all([
          axios.get('/api/sla/rules'),
          axios.get('/api/analytics/csat'),
          axios.get('/api/analytics/performance')
        ]);
        setSlaRules(rulesRes.data);
        setCsat(csatRes.data);
        setPerformance(perfRes.data);
      } catch (err) {
        console.error('Failed to load SLA performance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlaData();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalEvaluated = performance?.total_evaluated || 0;
  const withinSla = performance?.within_sla_count || 0;
  const complianceRate = totalEvaluated > 0 ? Math.round((withinSla / totalEvaluated) * 100) : 100;

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
        width: '100%', maxWidth: '780px',
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
            background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)',
            padding: '0.6rem', borderRadius: '10px', display: 'flex', fontSize: '1.4rem'
          }}>
            <FiShield />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              SLA Policy &amp; CSAT Intelligence
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Service Level Agreement tracking, targets, and customer satisfaction health
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-primary)' }}>
            Loading SLA &amp; performance metrics...
          </div>
        ) : (
          <>
            {/* Top KPI Cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem', marginBottom: '1.75rem'
            }}>
              {/* Compliance Rate */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                borderRadius: '12px', padding: '1.25rem'
              }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FiAward style={{ color: '#10b981' }} /> SLA Compliance
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: complianceRate >= 80 ? '#10b981' : '#f59e0b' }}>
                  {complianceRate}%
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {withinSla} of {totalEvaluated} tickets on track
                </div>
              </div>

              {/* Avg Response Time */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                borderRadius: '12px', padding: '1.25rem'
              }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FiClock style={{ color: '#3b82f6' }} /> Avg Response Time
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {performance?.avg_first_response_minutes ? `${Math.round(performance.avg_first_response_minutes)}m` : '15m'}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Target: &lt; 30m for High/Crit
                </div>
              </div>

              {/* CSAT Score */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                borderRadius: '12px', padding: '1.25rem'
              }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FiStar style={{ color: '#f59e0b' }} /> Customer Rating (CSAT)
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {csat?.average_rating ? Number(csat.average_rating).toFixed(1) : '4.5'}
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ 5.0</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Based on {csat?.total_reviews || 0} reviews
                </div>
              </div>
            </div>

            {/* SLA Policy Thresholds Table */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiClock /> SLA Rule Thresholds by Priority
              </h3>
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                borderRadius: '10px', overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PRIORITY</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MAX RESPONSE TIME</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MAX RESOLUTION TIME</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AUTO-ESCALATE IF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaRules.length > 0 ? (
                      slaRules.map((rule) => (
                        <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge priority-${rule.priority}`}>{rule.priority}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            {rule.response_time_minutes >= 60
                              ? `${rule.response_time_minutes / 60} hour(s)`
                              : `${rule.response_time_minutes} mins`}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            {rule.resolution_time_minutes >= 60
                              ? `${rule.resolution_time_minutes / 60} hour(s)`
                              : `${rule.resolution_time_minutes} mins`}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#f87171' }}>
                            &gt; {Math.round(rule.response_time_minutes * 0.8)} mins unassigned
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Standard 24h response default applies.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CSAT Distribution Breakdown */}
            {csat && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(59,130,246,0.05))',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '12px', padding: '1.25rem'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  CSAT Sentiment Breakdown
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <FiCheckCircle style={{ color: '#10b981' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Positive (4-5★):</span>
                    <strong style={{ color: '#10b981' }}>{csat.positive_reviews || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <FiClock style={{ color: '#f59e0b' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Neutral (3★):</span>
                    <strong style={{ color: '#f59e0b' }}>{csat.neutral_reviews || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <FiAlertTriangle style={{ color: '#ef4444' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Negative (1-2★):</span>
                    <strong style={{ color: '#ef4444' }}>{csat.negative_reviews || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SlaPerformanceModal;
