import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const CHART_BG = 'transparent';

const tooltipStyle = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
  },
  labelStyle: { color: '#94a3b8' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

// ── Category Bar Chart ────────────────────────────────────────────
export const CategoryBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis
        dataKey="category"
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        axisLine={{ stroke: '#334155' }}
        tickLine={false}
        interval={0}
        angle={-25}
        textAnchor="end"
        height={55}
      />
      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip {...tooltipStyle} />
      <Bar dataKey="ticket_count" name="Tickets" radius={[6, 6, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={`hsl(${220 + i * 30}, 80%, 60%)`} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ── Priority Pie Chart ────────────────────────────────────────────
const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#10b981',
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const PriorityPieChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={data}
        dataKey="ticket_count"
        nameKey="priority"
        cx="50%"
        cy="50%"
        outerRadius={80}
        labelLine={false}
        label={CustomPieLabel}
      >
        {data.map((entry) => (
          <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#64748b'} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle.contentStyle}
        formatter={(val, name) => [val, name]}
      />
      <Legend
        iconType="circle"
        iconSize={8}
        formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
      />
    </PieChart>
  </ResponsiveContainer>
);

// ── Status Donut Chart ────────────────────────────────────────────
const STATUS_COLORS = {
  Open: '#ef4444',
  'In Progress': '#f59e0b',
  Resolved: '#10b981',
};

export const StatusDonutChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={data}
        dataKey="ticket_count"
        nameKey="status"
        cx="50%"
        cy="50%"
        innerRadius={55}
        outerRadius={85}
        paddingAngle={3}
        labelLine={false}
        label={CustomPieLabel}
      >
        {data.map((entry) => (
          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle.contentStyle}
        formatter={(val, name) => [val, name]}
      />
      <Legend
        iconType="circle"
        iconSize={8}
        formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
      />
    </PieChart>
  </ResponsiveContainer>
);

// ── Trends Line Chart ─────────────────────────────────────────────
export const TrendsLineChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip {...tooltipStyle} />
      <Line
        type="monotone"
        dataKey="ticket_count"
        name="Tickets"
        stroke="url(#trendGrad)"
        strokeWidth={3}
        dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
        activeDot={{ r: 6, fill: '#3b82f6' }}
      />
    </LineChart>
  </ResponsiveContainer>
);
