import { ShieldAlert, AlertTriangle, FileText, MapPin, User, Clock, DollarSign, Search, Activity, Calendar, History, Globe, PieChart, Target } from 'lucide-react';

const riskColors = {
  low: { color: 'var(--green)', bg: 'var(--green-bg)', border: 'rgba(16, 185, 129, 0.3)' },
  medium: { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'rgba(245, 158, 11, 0.3)' },
  high: { color: 'var(--red)', bg: 'var(--red-bg)', border: 'rgba(239, 68, 68, 0.3)' },
  critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)' },
};

export default function ReportPanel({ investigation }) {
  if (!investigation) return null;

  const tx = investigation.transaction;
  const risk = riskColors[investigation.riskLevel] || riskColors.medium;

  const formatAmount = (a) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Risk Score Header */}
      <div className="glass-card" style={{
        padding: 'var(--space-2xl)',
        background: `linear-gradient(135deg, ${risk.bg}, var(--bg-card))`,
        border: `1px solid ${risk.border}`,
        animation: 'fadeIn 0.5s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)' }}>
          {/* Risk Gauge */}
          <div className="risk-gauge" style={{
            background: `conic-gradient(${risk.color} ${investigation.riskScore * 3.6}deg, var(--bg-tertiary) 0deg)`,
            flexShrink: 0,
          }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div className="risk-gauge-value" style={{ color: risk.color }}>
                {investigation.riskScore}
              </div>
              <div className="risk-gauge-label">risk score</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <ShieldAlert size={18} color={risk.color} />
              <span style={{
                fontSize: 'var(--font-lg)',
                fontWeight: '700',
                color: risk.color,
                textTransform: 'uppercase',
              }}>
                {investigation.riskLevel} Risk
              </span>
            </div>
            <div style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-lg)',
            }}>
              Transaction {tx?.transactionId || 'Unknown'} — {formatAmount(tx?.amount || 0)}
            </div>

            {/* Transaction Quick Info */}
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
              {[
                { icon: User, label: 'Sender', value: tx?.sender?.name || '—' },
                { icon: DollarSign, label: 'Amount', value: formatAmount(tx?.amount || 0) },
                { icon: MapPin, label: 'Origin', value: `${tx?.location?.city || ''}, ${tx?.location?.country || ''}` },
                { icon: Clock, label: 'Time', value: tx?.timestamp ? new Date(tx.timestamp).toLocaleString() : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={13} color="var(--text-dim)" />
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{label}:</span>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-primary)', fontWeight: '500' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral & Context Profile */}
      {investigation.contextSummary && (
        <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.05s both' }}>
          <div className="glass-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Search size={16} color="var(--cyan)" />
              Behavioral & Context Profile
            </h2>
          </div>
          <div className="glass-card-body" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)'
          }}>
            {[
              { label: 'Account Age', value: investigation.contextSummary.accountAge || 'Unknown', icon: Calendar, color: 'var(--cyan)' },
              { label: 'Average Tx Amount', value: formatAmount(investigation.contextSummary.averageTransactionAmount || 0), icon: DollarSign, color: 'var(--green)' },
              { label: 'Tx Frequency', value: investigation.contextSummary.transactionFrequency || 'Unknown', icon: Activity, color: 'var(--purple)' },
              { label: 'Previous Flags', value: investigation.contextSummary.previousFlags || 0, icon: History, color: investigation.contextSummary.previousFlags > 0 ? 'var(--amber)' : 'var(--text-muted)' },
              { label: 'Geographic Pattern', value: investigation.contextSummary.geoPattern || 'Unknown', icon: Globe, color: 'var(--text-primary)' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: 'var(--space-md)',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)'
              }}>
                <div style={{
                  padding: '6px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex'
                }}>
                  <item.icon size={14} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-sm)', fontWeight: '500', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reporter Findings: Suspicion Breakdown & Actions */}
      {investigation.reporterFindings?.anomaly_percentages && Object.keys(investigation.reporterFindings.anomaly_percentages).length > 0 && (
        <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.08s both' }}>
          <div className="glass-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <PieChart size={16} color="var(--purple)" />
              Suspicion Breakdown & Action Plan
            </h2>
          </div>
          <div className="glass-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            
            {/* Percentage Breakdown */}
            <div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Anomaly Contribution Model (Score: {investigation.reporterFindings.overall_suspicion_score}/100)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {Object.entries(investigation.reporterFindings.anomaly_percentages)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, percentage]) => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div style={{ width: '150px', fontSize: 'var(--font-xs)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {category}
                      </div>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: 0, top: 0, bottom: 0, 
                          width: `${percentage}%`, 
                          background: percentage > 30 ? 'var(--red)' : percentage > 15 ? 'var(--amber)' : percentage > 5 ? 'var(--cyan)' : 'var(--text-muted)',
                          borderRadius: '3px'
                        }} />
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {percentage}%
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Action Suggestions */}
            {investigation.reporterFindings.action_suggestions && investigation.reporterFindings.action_suggestions.length > 0 && (
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-sm)', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                  <Target size={14} color="var(--amber)" />
                  Targeted Agent Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {investigation.reporterFindings.action_suggestions.map((sug, i) => (
                    <div key={i} style={{ padding: 'var(--space-md)', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--amber)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: 'var(--font-sm)', marginBottom: '4px' }}>
                        {sug.action}
                      </div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--text-muted)' }}>Reasoning: </strong>{sug.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anomaly Flags */}
      {investigation.anomalyFlags?.length > 0 && (
        <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.1s both' }}>
          <div className="glass-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <AlertTriangle size={16} color="var(--amber)" />
              Anomaly Flags ({investigation.anomalyFlags.length})
            </h2>
          </div>
          <div className="glass-card-body" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}>
            {investigation.anomalyFlags.map((flag, i) => (
              <span
                key={i}
                className="badge badge-amber"
                style={{ fontSize: '10px', padding: '4px 10px' }}
              >
                {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Violations */}
      {investigation.complianceViolations?.length > 0 && (
        <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.2s both' }}>
          <div className="glass-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <FileText size={16} color="var(--red)" />
              Compliance Violations ({investigation.complianceViolations.length})
            </h2>
          </div>
          <div className="glass-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {investigation.complianceViolations.map((v, i) => {
              const sevColors = {
                low: 'badge-green',
                medium: 'badge-amber',
                high: 'badge-red',
                critical: 'badge-red',
              };
              return (
                <div
                  key={i}
                  style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                    <span className={`badge ${sevColors[v.severity] || 'badge-amber'}`} style={{ fontSize: '9px' }}>
                      {v.severity}
                    </span>
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {v.rule}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {investigation.explanation && (
        <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.3s both' }}>
          <div className="glass-card-header">
            <h2>AI Investigation Report</h2>
          </div>
          <div className="glass-card-body">
            <pre className="terminal-block">
              {investigation.explanation}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
