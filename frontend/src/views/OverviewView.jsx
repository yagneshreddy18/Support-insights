import React from 'react';
import {
  FiInbox, FiClock, FiCheckCircle, FiAlertCircle,
  FiActivity, FiTrendingUp
} from 'react-icons/fi';
import {
  CategoryBarChart,
  PriorityPieChart,
  StatusDonutChart,
  TrendsLineChart,
} from '../DashboardCharts';

const OverviewView = ({ summary, categoryStats, priorityStats, statusStats, trends }) => {
  return (
    <div className="tab-view-container">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-title"><FiInbox /> Total Tickets</div>
          <div className="card-value">{summary?.total_tickets || 0}</div>
        </div>
        <div className="card">
          <div className="card-title"><FiClock /> Open &amp; In Progress</div>
          <div className="card-value">
            {(summary?.open_tickets || 0) + (summary?.in_progress_tickets || 0)}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><FiCheckCircle /> Resolved</div>
          <div className="card-value">{summary?.resolved_tickets || 0}</div>
        </div>
        <div className="card">
          <div className="card-title"><FiAlertCircle /> Critical Priority</div>
          <div className="card-value">{summary?.critical_tickets || 0}</div>
        </div>
        <div className="card risk">
          <div className="card-title"><FiActivity /> Avg SLA Breach Risk</div>
          <div className="card-value">
            {summary?.average_sla_breach_probability
              ? (summary.average_sla_breach_probability * 100).toFixed(1) + '%'
              : 'N/A'}
          </div>
        </div>
        <div className="card polarity">
          <div className="card-title"><FiTrendingUp /> Negative Polarity</div>
          <div className="card-value">{summary?.negative_polarity_tickets || 0}</div>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Category</div>
          <CategoryBarChart data={categoryStats} />
        </div>
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Priority</div>
          <PriorityPieChart data={priorityStats} />
        </div>
        <div className="card chart-card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Tickets by Status</div>
          <StatusDonutChart data={statusStats} />
        </div>
        <div className="card chart-card chart-wide">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Ticket Volume (Last 30 Days)</div>
          {trends && trends.length > 0
            ? <TrendsLineChart data={trends} />
            : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '4rem' }}>No trend data available yet</div>
          }
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
