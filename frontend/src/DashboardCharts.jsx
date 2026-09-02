import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const CHART_BG = 'transparent';

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(12, 18, 30, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#f1f5f9',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: '13px',
  },
  labelStyle: { color: '#94a3b8', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' },
  cursor: { fill: 'rgba(99,102,241,0.07)' },
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
      <Bar dataKey="ticket_count" name="Tickets" radius={[5, 5, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={`hsl(${240 + i * 22}, 75%, ${58 + (i % 3) * 6}%)`} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ── Priority Pie Chart ────────────────────────────────────────────
const PRIORITY_COLORS = {
  Critical: '#f43f5e',
  High: '#f59e0b',
  Medium: '#6366f1',
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
  Open: '#f43f5e',
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
          <stop offset="0%" stopColor="#6366f1" />
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
        activeDot={{ r: 6, fill: '#6366f1', stroke: '#a5b4fc', strokeWidth: 2 }}
      />
    </LineChart>
  </ResponsiveContainer>
);
