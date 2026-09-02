import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiShield, FiClock, FiStar, FiAward, FiCheckCircle, FiAlertTriangle
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
      <div className="tab-view-container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--accent-primary)' }}>
        Loading SLA &amp; CSAT Intelligence...
      </div>
    );
  }

  return (
    <div className="tab-view-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>SLA Policy &amp; Customer Satisfaction</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monitor service level agreement compliance and customer satisfaction benchmarks</p>
      </div>

      {/* Top Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem', marginBottom: '2rem'
      }}>
        {/* Compliance Rate */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiAward style={{ color: '#10b981' }} /> SLA Compliance Rate
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: complianceRate >= 80 ? '#10b981' : '#f59e0b', margin: '0.5rem 0' }}>
            {complianceRate}%
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{withinSla}</strong> of {totalEvaluated} tickets within SLA limit
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiClock style={{ color: '#3b82f6' }} /> Avg First Response Time
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0' }}>
            {performance?.avg_first_response_minutes ? `${Math.round(performance.avg_first_response_minutes)}m` : '15m'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Target: &lt; 30 mins for High/Critical tickets
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiClock style={{ color: '#a78bfa' }} /> Avg Resolution Duration
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#a78bfa', margin: '0.5rem 0' }}>
            {performance?.avg_resolution_hours ? `${performance.avg_resolution_hours}h` : '2.4h'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Overall ticket turnaround time
          </div>
        </div>

        {/* CSAT Score */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiStar style={{ color: '#f59e0b' }} /> Customer Rating (CSAT)
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {csat?.average_rating ? Number(csat.average_rating).toFixed(1) : '4.5'}
            <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>/ 5.0</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Based on {csat?.total_reviews || 0} customer reviews
          </div>
        </div>
      </div>

      {/* SLA Threshold Matrix Table */}
      <div className="tickets-section" style={{ marginBottom: '2rem' }}>
        <div className="tickets-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiShield /> SLA Rule Threshold Matrix by Priority
          </h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Priority Level</th>
                <th>Target Response Time</th>
                <th>Target Resolution Time</th>
                <th>Escalation Trigger Threshold</th>
              </tr>
            </thead>
            <tbody>
              {slaRules.length > 0 ? (
                slaRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <span className={`badge priority-${rule.priority}`}>{rule.priority}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {rule.response_time_minutes >= 60
                        ? `${rule.response_time_minutes / 60} hour(s)`
                        : `${rule.response_time_minutes} mins`}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {rule.resolution_time_minutes >= 60
                        ? `${rule.resolution_time_minutes / 60} hour(s)`
                        : `${rule.resolution_time_minutes} mins`}
                    </td>
                    <td style={{ color: '#f87171', fontWeight: 600 }}>
                      &gt; {Math.round(rule.response_time_minutes * 0.8)} mins unassigned
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Standard default policy applies.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSAT Breakdown */}
      {csat && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(59,130,246,0.05))',
          border: '1px solid rgba(245,158,11,0.2)',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Customer Satisfaction (CSAT) Sentiment Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <FiCheckCircle style={{ color: '#10b981', fontSize: '1.5rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Positive Reviews (4-5★)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{csat.positive_reviews || 0}</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <FiClock style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Neutral Reviews (3★)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>{csat.neutral_reviews || 0}</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <FiAlertTriangle style={{ color: '#ef4444', fontSize: '1.5rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Negative Reviews (1-2★)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>{csat.negative_reviews || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlaView;
