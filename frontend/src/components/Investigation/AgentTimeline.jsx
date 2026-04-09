import { Bot, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

const statusConfig = {
  success: { icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-bg)' },
  warning: { icon: AlertTriangle, color: 'var(--amber)', bg: 'var(--amber-bg)' },
  error: { icon: XCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
  critical: { icon: XCircle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' },
};

export default function AgentTimeline({ agentLogs = [] }) {
  if (!agentLogs.length) return null;

  return (
    <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.15s both' }}>
      <div className="glass-card-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Bot size={16} color="var(--cyan)" />
          Agent Pipeline Execution
        </h2>
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
          {agentLogs.length} agents executed
        </span>
      </div>
      <div className="glass-card-body" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
        {agentLogs.map((log, i) => {
          const config = statusConfig[log.status] || statusConfig.success;
          const StatusIcon = config.icon;
          const isLast = i === agentLogs.length - 1;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 'var(--space-lg)',
                animation: `slideInRight 0.4s ease ${i * 0.12}s both`,
              }}
            >
              {/* Timeline Line */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: config.bg,
                  border: `2px solid ${config.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <StatusIcon size={14} color={config.color} />
                </div>
                {!isLast && (
                  <div style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '30px',
                    background: `linear-gradient(to bottom, ${config.color}40, var(--border-subtle))`,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                paddingBottom: isLast ? 0 : 'var(--space-xl)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontSize: 'var(--font-sm)',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                  }}>
                    {log.agentName}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-muted)',
                  }}>
                    <Clock size={11} />
                    {log.executionTimeMs?.toFixed(1) || 0}ms
                  </div>
                </div>

                {/* Agent-specific output summary */}
                {log.output && (
                  <div className="terminal-block fade-in" style={{ marginTop: '10px' }}>
                    {log.agentName.includes('Detective') && log.output.anomalyScore !== undefined && (
                      <div>
                        Anomaly Score: <strong style={{ color: config.color }}>{log.output.anomalyScore}</strong>
                        {' • '}ML Prediction: <strong>{log.output.mlPrediction}</strong>
                        {log.output.flags?.length > 0 && (
                          <span> • {log.output.flags.length} flag(s) triggered</span>
                        )}
                      </div>
                    )}
                    {log.agentName.includes('Researcher') && log.output.senderProfile && (
                      <div>
                        Sender: <strong>{log.output.senderProfile.name}</strong>
                        {' • '}Risk: <strong>{log.output.senderProfile.riskProfile}</strong>
                        {' • '}Previous Flags: <strong>{log.output.senderProfile.previousFlags}</strong>
                        {log.output.behavioralFlags?.length > 0 && (
                          <div style={{ color: 'var(--amber-light)', marginTop: '2px' }}>
                            ⚠ {log.output.behavioralFlags.join(' | ')}
                          </div>
                        )}
                      </div>
                    )}
                    {log.agentName.includes('Compliance') && (
                      <div>
                        Violations: <strong style={{ color: log.output.violationCount > 0 ? 'var(--red-light)' : 'var(--green-light)' }}>
                          {log.output.violationCount}
                        </strong>
                        {' • '}Risk Adjustment: <strong>+{log.output.riskAdjustment}</strong>
                        {' • '}Rules Evaluated: <strong>{log.output.rulesEvaluated?.length || 0}</strong>
                      </div>
                    )}
                    {log.agentName.includes('Boss') && log.output.recommendedAction && (
                      <div>
                        Recommended Action: <strong style={{
                          color: log.output.recommendedAction === 'block' ? 'var(--red-light)' :
                                 log.output.recommendedAction === 'escalate' ? 'var(--purple-light)' :
                                 log.output.recommendedAction === 'monitor' ? 'var(--amber-light)' : 'var(--green-light)',
                        }}>
                          {log.output.recommendedAction.toUpperCase()}
                        </strong>
                        {' • '}Final Risk: <strong>{log.output.finalRiskScore}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
