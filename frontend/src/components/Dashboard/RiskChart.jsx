import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      fontSize: 'var(--font-xs)',
    }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{payload[0].name}</p>
      <p style={{ color: payload[0].color || 'var(--text-secondary)' }}>{payload[0].value} cases</p>
    </div>
  );
};

export default function RiskChart({ investigations = [] }) {
  // Risk level distribution
  const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
  investigations.forEach((inv) => {
    if (riskDist[inv.riskLevel] !== undefined) riskDist[inv.riskLevel]++;
  });

  const pieData = Object.entries(riskDist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Action distribution
  const actionDist = { block: 0, monitor: 0, escalate: 0, dismiss: 0 };
  investigations.forEach((inv) => {
    if (actionDist[inv.recommendedAction] !== undefined) actionDist[inv.recommendedAction]++;
  });

  const barData = Object.entries(actionDist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

  const barColors = {
    Block: '#ef4444',
    Monitor: '#f59e0b',
    Escalate: '#8b5cf6',
    Dismiss: '#10b981',
  };

  return (
    <div className="grid-2" style={{ animation: 'fadeIn 0.5s ease 0.4s both' }}>
      {/* Risk Distribution Pie */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h2>Risk Distribution</h2>
        </div>
        <div className="glass-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RISK_COLORS[entry.name.toLowerCase()] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {pieData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: RISK_COLORS[entry.name.toLowerCase()],
                    }} />
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', minWidth: '55px' }}>
                      {entry.name}
                    </span>
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No investigation data</p>
          )}
        </div>
      </div>

      {/* Action Distribution Bar */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h2>Recommended Actions</h2>
        </div>
        <div className="glass-card-body">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={barColors[entry.name] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No investigation data</p>
          )}
        </div>
      </div>
    </div>
  );
}
