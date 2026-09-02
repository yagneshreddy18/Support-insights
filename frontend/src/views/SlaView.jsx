import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiShield, FiClock, FiStar, FiAward, FiCheckCircle, FiAlertTriangle, FiTrendingUp
} from 'react-icons/fi';

const SlaView = () => {
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
  }, []);

  const totalEvaluated = performance?.total_evaluated || 0;
  const withinSla = performance?.within_sla_count || 0;
  const complianceRate = totalEvaluated > 0 ? Math.round((withinSla / totalEvaluated) * 100) : 100;

  if (loading) {
    return (
      <div className="tab-view-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading SLA &amp; CSAT Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="tab-view-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
          SLA Policy &amp; Customer Satisfaction
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Monitor service level agreement compliance and CSAT benchmarks across all ticket categories
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title"><FiAward style={{ color: 'var(--emerald)' }} /> SLA Compliance</div>
          <div className="card-value" style={{ color: complianceRate >= 80 ? 'var(--emerald)' : 'var(--amber)' }}>
            {complianceRate}%
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
            <strong style={{ color: 'var(--text-main)' }}>{withinSla}</strong> / {totalEvaluated} tickets within SLA
          </div>
        </div>

        <div className="card">
          <div className="card-title"><FiClock style={{ color: '#60a5fa' }} /> Avg First Response</div>
          <div className="card-value" style={{ color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
            {performance?.avg_first_response_minutes ? `${Math.round(performance.avg_first_response_minutes)}m` : '—'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
            Target: &lt; 30 mins for High / Critical
          </div>
        </div>

        <div className="card">
          <div className="card-title"><FiTrendingUp style={{ color: 'var(--accent-purple)' }} /> Avg Resolution</div>
          <div className="card-value" style={{ color: 'var(--accent-purple)', fontVariantNumeric: 'tabular-nums' }}>
            {performance?.avg_resolution_hours ? `${performance.avg_resolution_hours}h` : '—'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
            Overall ticket turnaround time
          </div>
        </div>

        <div className="card">
          <div className="card-title"><FiStar style={{ color: 'var(--amber)' }} /> CSAT Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
            <div className="card-value" style={{ color: 'var(--amber)' }}>
              {csat?.average_rating ? Number(csat.average_rating).toFixed(1) : '—'}
            </div>
            <span style={{ color: 'var(--text-dim)', fontSize: '1rem', fontWeight: 500 }}>/ 5.0</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.4rem' }}>
            {csat?.total_reviews || 0} customer reviews submitted
          </div>
        </div>
      </div>

      {/* SLA Threshold Matrix Table */}
      <div className="tickets-section" style={{ marginBottom: '2rem' }}>
        <div className="tickets-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiShield style={{ color: 'var(--primary)' }} /> SLA Rule Threshold Matrix by Priority
          </h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Priority Level</th>
                <th>Target Response Time</th>
                <th>Target Resolution Time</th>
                <th>Escalation Trigger</th>
              </tr>
            </thead>
            <tbody>
              {slaRules.length > 0 ? (
                slaRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <span className={`badge priority-${rule.priority}`}>{rule.priority}</span>
                    </td>
                    <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {rule.response_time_minutes >= 60
                        ? `${rule.response_time_minutes / 60}h`
                        : `${rule.response_time_minutes}m`}
                    </td>
                    <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {rule.resolution_time_minutes >= 60
                        ? `${rule.resolution_time_minutes / 60}h`
                        : `${rule.resolution_time_minutes}m`}
                    </td>
                    <td style={{ color: '#fb7185', fontWeight: 600, fontSize: '0.85rem' }}>
                      &gt; {Math.round(rule.response_time_minutes * 0.8)}m unassigned
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    Standard default SLA policy applies (no custom rules configured)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSAT Breakdown */}
      {csat && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(99,102,241,0.04))', border: '1px solid rgba(245,158,11,0.15)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiStar style={{ color: 'var(--amber)' }} /> Customer Satisfaction (CSAT) Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--emerald-bg)', border: '1px solid var(--emerald-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiCheckCircle style={{ color: 'var(--emerald)', fontSize: '1.4rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positive (4–5 ★)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald)', fontVariantNumeric: 'tabular-nums' }}>{csat.positive_reviews || 0}</div>
              </div>
            </div>
            <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiClock style={{ color: 'var(--amber)', fontSize: '1.4rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neutral (3 ★)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>{csat.neutral_reviews || 0}</div>
              </div>
            </div>
            <div style={{ background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiAlertTriangle style={{ color: 'var(--rose)', fontSize: '1.4rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Negative (1–2 ★)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rose)', fontVariantNumeric: 'tabular-nums' }}>{csat.negative_reviews || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlaView;
